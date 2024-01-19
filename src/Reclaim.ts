import type { ProviderV2, Proof, RequestedProofs, Context } from './interfaces';
import { getIdentifierFromClaimInfo } from '@reclaimprotocol/witness-sdk';
import type { QueryParams, SignedClaim } from './types';
import uuid from 'react-native-uuid';
import { ethers } from 'ethers';
import { parse } from './utils';
import { Linking } from 'react-native';
import serialize from 'canonicalize';
import {
  getWitnessesForClaim,
  decodeContext,
  encodeContext,
  assertValidSignedClaim,
} from './utils';

export class ReclaimClient {
  applicationSecret: string;
  appCallbackUrl?: string | null;
  sessionId: string = '';
  deepLinkData?: QueryParams | null;
  context: Context = { contextAddress: '0x0', contextMessage: '' };
  verificationRequest?: ReclaimVerficationRequest;

  constructor(applicationSecret: string, sessionId?: string) {
    this.applicationSecret = applicationSecret;
    if (sessionId) {
      this.sessionId = sessionId;
    } else {
      this.sessionId = uuid.v4().toString();
    }
  }

  async createVerificationRequest(providers: string[]) {
    const appCallbackUrl = await this.getAppCallbackUrl();
    const providersV2 = await this.buildHttpProviderV2ByName(providers);

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
    const providersV2 = await this.buildHttpProviderV2ByName(providers);
    const requestedProofs = await this.buildRequestedProofs(
      providersV2,
      appCallbackUrl
    );
    const deepLink = 'reclaimprotocol://requestedproofs/';
    const deepLinkUrl = `${deepLink}?template=${encodeURIComponent(
      JSON.stringify(requestedProofs)
    )}`;
    return deepLinkUrl;
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

  async buildHttpProviderV2ByName(
    providerNames: string[]
  ): Promise<ProviderV2[]> {
    try {
      const reclaimServerUrl =
        'https://api.reclaimprotocol.org/get/httpsproviders';
      const response = await fetch(reclaimServerUrl);

      if (!response.ok) {
        throw new Error('Failed to fetch HTTP providers');
      }

      const providers = (await response.json()).providers as ProviderV2[];

      const filteredProviders = providers.filter((provider) => {
        return providerNames.includes(provider.name);
      });

      return filteredProviders;
    } catch (error) {
      console.error('Error fetching HTTP providers:', error);
      throw error;
    }
  }

  buildRequestedProofs(
    providers: ProviderV2[],
    callbackUrl: string
  ): RequestedProofs {
    const claims = providers.map((provider) => {
      return {
        provider: provider.name,
        context: JSON.stringify(this.context),
        payload: {
          metadata: {
            name: provider.name,
            logoUrl: provider.logoUrl,
          },
          url: provider.url,
          urlType: provider.urlType,
          method: provider.Method,
          login: {
            url: provider.logoUrl,
          },
          parameter: {},
          responseSelections: provider.responseSelections,
          templateClaimId: provider.id,
          headers: provider.loginHeaders,
          customInjection: provider.customInjection,
          bodySniff: provider.bodySniff,
          userAgent: provider.userAgent,
        },
      };
    });

    return {
      id: uuid.v4().toString(),
      sessionId: this.sessionId,
      name: 'RN-SDK',
      callbackUrl: callbackUrl,
      //@ts-ignore
      claims: claims,
    };
  }

  registerHandlers() {
    Linking.addEventListener('url', this.handleDeepLinkEvent.bind(this));
  }

  handleDeepLinkEvent(event: { url: string }) {
    try {
      const receivedDeepLinkUrl = event.url;
      const queryParams = parse(receivedDeepLinkUrl)?.queryParams;

      if (queryParams) {
        this.deepLinkData = queryParams;
        const proofs = (queryParams.proofs as unknown as Proof[]) ?? [];
        if (this.verificationRequest?.onSuccessCallback) {
          proofs.forEach((proof) => {
            this.verifySignedProof(proof);
          });
          this.verificationRequest?.onSuccessCallback(proofs);
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
      const signedClaim: SignedClaim = {
        claim: {
          ...proof.claimData,
        },
        signatures: proof.signatures.map((signature) => {
          return ethers.getBytes(signature);
        }),
      };
      // for proofs generated directly on the app, the context is empty
      let encodedCtx = '';
      if (proof.claimData.context) {
        const decodedCtx = decodeContext(proof.claimData.context);
        encodedCtx = encodeContext(
          {
            contextMessage: decodedCtx.contextMessage,
            contextAddress: decodedCtx.contextAddress,
          },
          this.sessionId,
          true
        );
      }
      // then hash the claim info with the encoded ctx to get the identifier
      const calculatedIdentifier = getIdentifierFromClaimInfo({
        parameters: serialize(proof.claimData.parameters)!,
        provider: proof.claimData.provider,
        context: encodedCtx,
      });
      // check if the identifier matches the one in the proof
      if (calculatedIdentifier !== proof.identifier) {
        throw new Error('Identifier Mismatch');
      }

      // verify the witness signature
      assertValidSignedClaim(signedClaim, witnesses);
    } catch (e: Error | unknown) {
      console.error(e);
      return false;
    }

    return true;
  }
}

class ReclaimVerficationRequest {
  onSuccessCallback?: (data: Proof[] | Error | unknown) => void | unknown;
  onFailureCallback?: (data: Proof[] | Error | unknown) => void | unknown;
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
