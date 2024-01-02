import { openURL, canOpenURL, parse, addEventListener } from 'expo-linking';
import type { ProofRequest } from './interfaces';

class Reclaim {
  static async requestProof(request: ProofRequest, AppCallbackUrl: string) {
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

    // Handle deep link redirection
    const handleDeepLink = (event: { url: string }) => {
      // Handle the deep link URL received from the AppClip/InstantApp
      const receivedDeepLinkUrl = event.url;

      // Check if this is the expected deep link
      if (receivedDeepLinkUrl.startsWith(deepLink)) {
        // Extract parameters from the deep link URL as needed
        const params = parse(receivedDeepLinkUrl);

        // Perform actions based on the received parameters
        console.log('Deep link received:', params);
      }
    };

    // Add event listener for deep links
    const subscription = addEventListener('url', handleDeepLink);

    // Remember to remove the event listener when your component unmounts
    // to avoid memory leaks
    return () => {
      subscription.remove();
    };
  }
}

export default Reclaim;
