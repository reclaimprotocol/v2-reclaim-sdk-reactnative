import { openURL, parse, addEventListener, getInitialURL } from 'expo-linking';
import type { ProviderV2, Proof, RequestedProofs } from './interfaces';
import type { Context } from './interfaces';
import uuid from 'react-native-uuid';
import { ethers } from 'ethers';

export class ReclaimClient {
  applicationId: string;
  sessionId: string = '';
  deepLinkData?: Proof[];
  context: Context = { contextAddress: '0x0', contextMessage: '' };
  verificationRequest?: ReclaimVerficationRequest;

  constructor(applicationSecret: string) {
    this.applicationId = applicationSecret;
    this.sessionId = uuid.v4().toString();
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

  async getAppCallbackUrl() {
    const appCallbackUrl = await getInitialURL();
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
    addEventListener('url', this.handleDeepLinkEvent.bind(this));
  }

  handleDeepLinkEvent(event: { url: string }) {
    try {
      const receivedDeepLinkUrl = event.url;
      const params = parse(receivedDeepLinkUrl) as unknown as Proof[];
      this.deepLinkData = params;
      if (this.verificationRequest?.onSuccessCallback) {
        params.forEach((param) => {
          this.verifySignedProof(param);
        });
        this.verificationRequest?.onSuccessCallback(params);
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

  verifySignedProof(proof: Proof) {
    const identifier = calculateIdentifier(
      proof.claimData.provider,
      proof.claimData.parameters,
      proof.claimData.owner,
      proof.claimData.timestampS,
      proof.claimData.context
    );
    if (proof.identifier !== identifier) {
      throw new Error('Identifier Mismatch');
    }
    if (!proof.signatures.length) {
      throw new Error('No signatures');
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

  start() {
    if (this.reclaimDeepLink) {
      openURL(this.reclaimDeepLink);
    }
  }
}

const calculateIdentifier = (
  provider: string,
  parameters: string,
  owner: string,
  timestampS: number,
  context: string
) => {
  const concatenatedString = `${provider}-${parameters}-${owner}-${timestampS}-${context}`;

  const identifier = ethers.id(concatenatedString);

  return identifier;
};
