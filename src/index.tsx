import * as Linking from 'expo-linking';

import type { ProofRequest } from './interfaces';

class Reclaim {
  static async requestProof(request: ProofRequest, AppCallbackUrl: string) {
    // Simulate proof request with a deep link (replace this with your actual logic)
    const deepLink = 'reclaimprotocol://requestedproofs/';
    const deepLinkUrl = `${deepLink}?callbackUrl=${encodeURIComponent(
      AppCallbackUrl
    )}&requestedproofs=${encodeURIComponent(JSON.stringify(request))}`;

    // Open the deep link
    const supported = await Linking.canOpenURL(deepLinkUrl);

    if (supported) {
      await Linking.openURL(deepLinkUrl);
    } else {
      console.error(`Deep linking is not supported for ${deepLink}`);
    }

    // Handle deep link redirection
    Linking.addEventListener('url', (event) => {
      // Handle the deep link URL received from the AppClip/InstantApp
      const receivedDeepLinkUrl = event.url;

      // Check if this is the expected deep link
      if (receivedDeepLinkUrl.startsWith(deepLink)) {
        // Extract parameters from the deep link URL as needed
        const params = Linking.parse(receivedDeepLinkUrl);

        // Perform actions based on the received parameters
        console.log('Deep link received:', params);
      }
    });
  }
}

export default Reclaim;
