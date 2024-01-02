import { useEffect, useState } from 'react';
import { openURL, canOpenURL, parse, addEventListener } from 'expo-linking';
import type { ProofRequest } from './interfaces';

const useReclaim = (): {
  requestProof: (request: ProofRequest, AppCallbackUrl: string) => void;
  deepLinkData: any;
} => {
  const [deepLinkData, setDeepLinkData] = useState<any>(null);

  const requestProof = async (
    request: ProofRequest,
    AppCallbackUrl: string
  ) => {
    const deepLink = 'reclaimprotocol://requestedproofs/';
    const deepLinkUrl = `${deepLink}?callbackUrl=${encodeURIComponent(
      AppCallbackUrl
    )}&requestedproofs=${encodeURIComponent(JSON.stringify(request))}`;

    // Open the deep link
    const supported = await canOpenURL(deepLinkUrl);

    if (supported) {
      await openURL(deepLinkUrl);
    } else {
      console.error(`Deep linking is not supported for ${deepLink}`);
    }
  };

  useEffect(() => {
    // Handle deep link redirection
    const handleDeepLink = (event: { url: string }) => {
      // Handle the deep link URL received from the AppClip/InstantApp
      const receivedDeepLinkUrl = event.url;

      // Extract parameters from the deep link URL as needed
      const params = parse(receivedDeepLinkUrl);

      // Update the state with the received parameters
      setDeepLinkData(params);
    };

    // Add event listener for deep links
    const subscription = addEventListener('url', handleDeepLink);

    // Remember to remove the event listener when the component unmounts
    // to avoid memory leaks
    return () => {
      subscription.remove();
    };
  }, []); // Empty dependency array ensures that the effect runs once when the component mounts

  return { requestProof, deepLinkData };
};

export default useReclaim;
