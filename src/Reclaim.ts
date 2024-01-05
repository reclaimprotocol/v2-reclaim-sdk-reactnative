import { useState } from 'react';
import {
  openURL,
  canOpenURL,
  parse,
  addEventListener,
  getInitialURL,
} from 'expo-linking';
import type {
  ProofRequest,
  ProviderV2,
  HandlersOptions,
  VerifyOptions,
  Reclaim,
  Proof,
} from './interfaces';

export const useReclaim = (): Reclaim => {
  const [deepLinkData, setDeepLinkData] = useState<Proof[] | null>(null);

  const verify = async (options: VerifyOptions) => {
    const providers = await buildHttpProviderV2ByIds(options.providerIds);
    const appCallbackUrl = await getInitialURL();
    if (appCallbackUrl === null) {
      throw new Error('Deep Link is not set');
    }

    const proofRequest: ProofRequest = {
      title: options.title,
      requestedProofs: providers,
      contextMessage: options.contextMessage,
      contextAddress: options.contextAddress,
      appCallbackUrl: appCallbackUrl,
    };

    signProofRequest(proofRequest, options.privateKey);

    registerHandlers({
      onSuccessCallback: options.onSuccessCallback,
      onFailureCallback: options.onFailureCallback,
    });

    const reclaimDeepLink = await requestProof(proofRequest);
    openURL(reclaimDeepLink);
  };

  const buildHttpProviderV2ByIds = async (
    providerIds: string[]
  ): Promise<ProviderV2[]> => {
    try {
      const reclaimServerUrl =
        'https://api.reclaimprotocol.org/get/httpsproviders';
      const response = await fetch(reclaimServerUrl);

      if (!response.ok) {
        throw new Error('Failed to fetch HTTP providers');
      }

      const providers = (await response.json()).providers as ProviderV2[];

      const filteredProviders = providers.filter((provider) => {
        return providerIds.includes(provider.id);
      });

      return filteredProviders;
    } catch (error) {
      console.error('Error fetching HTTP providers:', error);
      throw error;
    }
  };

  const signProofRequest = (
    request: ProofRequest,
    privateKey: string
  ): ProofRequest => {
    try {
      // Convert the private key to a Buffer (assuming it's in hexadecimal format)
      const privateKeyBuffer = Buffer.from(privateKey, 'hex');

      // Serialize the request as a JSON string
      const requestJson = JSON.stringify(request);

      // Sign the request using a cryptographic library (e.g., Node.js crypto)
      const crypto = require('crypto'); // Import the crypto library

      const sign = crypto.createSign('sha256');
      sign.update(requestJson);
      sign.end();

      // Sign the request using the private key
      const signature = sign.sign(privateKeyBuffer, 'base64');

      // Add the signature to the request
      request.requestorSignature = signature;

      return request;
    } catch (error) {
      console.error('Error signing proof request:', error);
      throw error;
    }
  };

  const requestProof = async (request: ProofRequest): Promise<string> => {
    const deepLink = 'reclaimprotocol://requestedproofs/';
    const deepLinkUrl = `${deepLink}?template=${encodeURIComponent(
      JSON.stringify(request)
    )}`;

    // Open the deep link
    const supported = await canOpenURL(deepLinkUrl);

    if (!supported) {
      console.error(`Deep linking is not supported for ${deepLink}`);
      throw new Error(`Deep linking is not supported for ${deepLink}`);
    }

    return deepLinkUrl;
  };

  const registerHandlers = (options: HandlersOptions) => {
    const { onSuccessCallback, onFailureCallback } = options;

    const handleDeepLink = (event: { url: string }) => {
      try {
        const receivedDeepLinkUrl = event.url;
        const params = parse(receivedDeepLinkUrl) as unknown as Proof[];
        setDeepLinkData(params);
        if (onSuccessCallback !== undefined) {
          onSuccessCallback(params);
        }
      } catch (e: Error | unknown) {
        if (onFailureCallback !== undefined) {
          onFailureCallback(e);
        }
      }
    };

    addEventListener('url', handleDeepLink);
  };

  return {
    verify,
    buildHttpProviderV2ByIds,
    signProofRequest,
    requestProof,
    registerHandlers,
    deepLinkData,
  };
};
