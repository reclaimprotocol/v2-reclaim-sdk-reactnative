import type {
  ProviderV2,
  Proof,
  RequestedProofs,
  Context,
  RequestedClaim,
} from './interfaces';
import { getIdentifierFromClaimInfo } from './witness';
import type { QueryParams, SignedClaim } from './types';
import uuid from 'react-native-uuid';
import { ethers } from 'ethers';
import { getShortenedUrl, parse } from './utils';
import { Linking } from 'react-native';
import canonicalize from 'canonicalize';
import { getWitnessesForClaim, assertValidSignedClaim } from './utils';
import { constants } from './constants';

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
function replaceAll(str: string, find: string, replace: string) {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

const RECLAIM_SHARE_URL =
  'https://share.reclaimprotocol.org/instant/?template=';

export class ReclaimClient {
  applicationId: string;
  signature?: string;
  appCallbackUrl?: string | null;
  sessionId: string = '';
  deepLinkData?: QueryParams | null;
  requestedProofs?: RequestedProofs;
  context: Context = { contextAddress: '0x0', contextMessage: '' };
  verificationRequest?: ReclaimVerficationRequest;
  myProvidersList: ProviderV2[] = [];

  constructor(applicationId: string, sessionId?: string) {
    this.applicationId = applicationId;
    if (sessionId) {
      this.sessionId = sessionId;
    } else {
      this.sessionId = uuid.v4().toString();
    }
  }

  async createVerificationRequest(providers: string[]) {
    const appCallbackUrl = await this.getAppCallbackUrl();
    const providersV2 = await this.buildHttpProviderV2ByID(providers);

    const reclaimDeepLink = await this.createLinkRequest(providers);

    this.verificationRequest = new ReclaimVerficationRequest(
      providersV2,
      appCallbackUrl,
      reclaimDeepLink,
      this.sessionId
    );

    this.registerHandlers();
    return this.verificationRequest;
  }

  async createLinkRequest(providers: string[]) {
    const appCallbackUrl = await this.getAppCallbackUrl();
    const providersV2 = await this.buildHttpProviderV2ByID(providers);
    if (!this.requestedProofs) {
      await this.buildRequestedProofs(providersV2, appCallbackUrl);
    }

    if (!this.signature) {
      throw new Error('Signature is not set');
    }

    const appId = ethers
      .verifyMessage(
        ethers.getBytes(
          ethers.keccak256(
            new TextEncoder().encode(canonicalize(this.requestedProofs)!)
          )
        ),
        ethers.hexlify(this.signature)
      )
      .toLowerCase();

    if (appId !== this.applicationId) {
      throw new Error('Invalid signature');
    }

    const templateData = { ...this.requestedProofs, signature: this.signature };
    let template = `${RECLAIM_SHARE_URL}${encodeURIComponent(
      JSON.stringify(templateData)
    )}`;
    template = replaceAll(template, '(', '%28');
    template = replaceAll(template, ')', '%29');
    template = await getShortenedUrl(template);

    return template;
  }

  setAppCallbackUrl(url: string) {
    this.appCallbackUrl = url;
  }

  async getAppCallbackUrl() {
    let appCallbackUrl = this.appCallbackUrl;
    if (!appCallbackUrl) {
      appCallbackUrl = await Linking.getInitialURL();
    }
    if (!appCallbackUrl) {
      throw new Error('Deep Link is not set');
    }
    return appCallbackUrl;
  }

  setSignature(signature: string) {
    this.signature = signature;
  }

  // @dev Use this function only in development environments
  async getSignature(
    requestedProofs: RequestedProofs,
    applicationSecret: string
  ): Promise<string> {
    const wallet = new ethers.Wallet(applicationSecret);
    const signature = await wallet.signMessage(
      ethers.getBytes(
        ethers.keccak256(
          new TextEncoder().encode(canonicalize(requestedProofs)!)
        )
      )
    );

    return signature;
  }

  async buildHttpProviderV2ByID(providerIds: string[]): Promise<ProviderV2[]> {
    let appProviders: ProviderV2[] = [];

    try {
      if (providerIds.length === 0)
        throw new Error(
          'No provider Ids provided. Please pass at least one provider Id. Check https://dev.reclaimprotocol.org/applications for more details.'
        );

      if (this.myProvidersList.length > 0) {
        appProviders = this.myProvidersList;
      } else {
        const appProvidersUrl = `${constants.GET_PROVIDERS_BY_ID_API}/${this.applicationId}`;
        const appResponse = await fetch(appProvidersUrl);

        if (!appResponse.ok) {
          throw new Error('Failed to fetch HTTP providers');
        }

        try {
          appProviders = (await appResponse.json()).providers
            .httpProvider as ProviderV2[];
        } catch (e) {
          throw new Error('APP_ID is not valid! Please try again once more.');
        }
      }

      for (let i = 0; i < providerIds.length; i++) {
        const providerToAdd = appProviders.find((provider) => {
          return provider.httpProviderId === providerIds[i];
        });
        if (!providerToAdd) {
          throw new Error(
            'Required provider Id ' +
              providerIds[i] +
              ' not register to the app make sure you are using the right providerId Available Provider Ids : ' +
              appProviders.map((p) => p.httpProviderId).join(',')
          );
        }
      }
      return appProviders.filter((provider) =>
        providerIds.includes(provider.httpProviderId)
      );
    } catch (error) {
      console.error(`Error fetching HTTP providers ${providerIds}:`, error);
      throw error;
    }
  }

  buildRequestedProofs(
    providers: ProviderV2[],
    callbackUrl: string
  ): RequestedProofs {
    const claims = providers.map((provider) => {
      return {
        provider: encodeURIComponent(provider.name),
        context: JSON.stringify(this.context),
        templateClaimId: provider.id,
        payload: {
          metadata: {
            name: encodeURIComponent(provider.name),
            logoUrl: provider.logoUrl,
            proofCardText: provider.proofCardText,
            proofCardTitle: provider.proofCardTitle,
          },
          url: provider.url,
          urlType: provider.urlType as 'CONSTANT' | 'REGEX',
          method: provider.method as 'GET' | 'POST',
          login: {
            url: provider.loginUrl,
          },
          responseSelections: provider.responseSelections,
          customInjection: provider.customInjection,
          bodySniff: provider.bodySniff,
          userAgent: provider.userAgent,
          geoLocation: provider.geoLocation ? provider.geoLocation : '',
          matchType: provider.matchType ? provider.matchType : 'greedy',
        },
      } as RequestedClaim;
    });

    this.requestedProofs = {
      id: uuid.v4().toString(),
      sessionId: this.sessionId,
      name: 'web-SDK',
      callbackUrl: callbackUrl,
      claims: claims,
    };

    return this.requestedProofs!;
  }

  registerHandlers() {
    Linking.addEventListener('url', this.handleDeepLinkEvent.bind(this));
  }

  async handleDeepLinkEvent(event: { url: string }) {
    try {
      const receivedDeepLinkUrl = event.url;
      const res = parse(receivedDeepLinkUrl);
      const proof = (res.queryParams as unknown as Proof) ?? null;

      if (proof) {
        this.deepLinkData = res.queryParams;

        //@ts-ignore
        proof.claimData = JSON.parse(proof.claimData);
        //@ts-ignore
        proof.signatures = JSON.parse(proof.signatures);

        if (this.verificationRequest?.onSuccessCallback) {
          const verified = await this.verifySignedProof(proof);
          if (!verified) {
            throw new Error('Proof not verified');
          }
          this.verificationRequest?.onSuccessCallback(proof);
        }
      }
    } catch (e: Error | unknown) {
      if (this.verificationRequest?.onFailureCallback) {
        this.verificationRequest?.onFailureCallback(e);
      }
    }
  }

  addContext(address: string, message: string) {
    // TODO: sync data on backend
    this.context = {
      contextAddress: address,
      contextMessage: message,
    };
    return this.context;
  }

  async verifySignedProof(proof: Proof) {
    if (!proof.signatures.length) {
      throw new Error('No signatures');
    }
    const witnesses = await getWitnessesForClaim(
      proof.claimData.epoch,
      proof.identifier,
      proof.claimData.timestampS
    );

    try {
      // then hash the claim info with the encoded ctx to get the identifier
      const calculatedIdentifier = getIdentifierFromClaimInfo({
        parameters: JSON.parse(
          canonicalize(proof.claimData.parameters) as string
        ),
        provider: proof.claimData.provider,
        context: proof.claimData.context,
      });
      proof.identifier = proof.identifier.replace('"', '');
      proof.identifier = proof.identifier.replace('"', '');
      // check if the identifier matches the one in the proof
      if (calculatedIdentifier !== proof.identifier) {
        throw new Error('Identifier Mismatch');
      }

      const signedClaim: SignedClaim = {
        claim: {
          ...proof.claimData,
        },
        signatures: proof.signatures.map((signature) => {
          return ethers.getBytes(signature);
        }),
      };

      // verify the witness signature
      assertValidSignedClaim(signedClaim, witnesses);
    } catch (e: Error | unknown) {
      console.error(e);
      return false;
    }

    return true;
  }

  async getMyProvidersList() {
    if (this.myProvidersList.length > 0) return this.myProvidersList;

    const appProvidersUrl = `${constants.GET_PROVIDERS_BY_ID_API}/${this.applicationId}`;
    const appResponse = await fetch(appProvidersUrl);
    if (!appResponse.ok) {
      throw new Error('Failed to fetch HTTP providers');
    }

    this.myProvidersList = (await appResponse.json()).providers
      .httpProvider as ProviderV2[];
    return this.myProvidersList;
  }
}

class ReclaimVerficationRequest {
  onSuccessCallback?: (data: Proof | Error | unknown) => void | unknown;
  onFailureCallback?: (data: Proof | Error | unknown) => void | unknown;
  providers: ProviderV2[];
  appCallbackUrl: string;
  reclaimDeepLink?: string;
  sessionId?: string;

  constructor(
    providers: ProviderV2[],
    appCallbackUrl: string,
    reclaimDeepLink: string,
    sessionId: string
  ) {
    this.providers = providers;
    this.appCallbackUrl = appCallbackUrl;
    this.reclaimDeepLink = reclaimDeepLink;
    this.sessionId = sessionId;
  }

  on(
    event: string,
    callback: (data: Proof | Error | unknown) => void | unknown
  ) {
    if (event === 'success') {
      this.onSuccessCallback = callback;
    }
    if (event === 'error') {
      this.onFailureCallback = callback;
    }
    return this;
  }

  async start() {
    if (this.reclaimDeepLink) {
      await Linking.openURL(this.reclaimDeepLink);
    }
  }
}
