import type { EmitterSubscription } from 'react-native';
import Reclaim from '..';
import type { ProofRequest } from '../interfaces';
import * as Linking from 'expo-linking';

describe('Reclaim', () => {
  it('should request proof and handle deep link', async () => {
    const request: ProofRequest = {
      title: 'Example Proof Request',
      requestedProofs: [
        {
          name: 'ProviderName',
          logoUrl: 'https://provider-logo-url.com/logo.png',
          url: 'https://provider-api.com/data',
          urlType: 'API',
          method: 'GET',
          body: null,
          loginURL: 'https://provider-api.com/login',
          loginCookies: ['cookie1=value1', 'cookie2=value2'],
          loginHeaders: ['Authorization'],
          isActive: true,
          responseSelections: [
            {
              xPath: 'data/value',
              jsonPath: '$.data.value',
              regex: '\\d+',
            },
          ],
          completedTrigger: 'dataReceived',
          customInjection: 'customScript()',
          bodySniff: {
            enabled: true,
            regex: 'data=(.*)',
          },
          userAgent: 'Custom User Agent',
          isApproved: true,
        },
      ],
      contextMessage: 'Please provide the necessary proofs for verification.',
      contextAddress: '0x0',
      requestorSignature: 'your_requestor_signature', // Provide the actual signature
    };

    const AppCallbackUrl = 'your_callback_url';

    // Mock Linking.canOpenURL and Linking.openURL
    const mockCanOpenURL = jest
      .spyOn(Linking, 'canOpenURL')
      .mockResolvedValue(true);
    const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    // Mock Linking.addEventListener
    const mockAddEventListener = jest
      .spyOn(Linking, 'addEventListener')
      .mockImplementation(
        (_type: string, handler: (event: { url: string }) => void) => {
          const emitter = {
            remove: jest.fn(),
          } as unknown as EmitterSubscription;
          handler({ url: 'reclaimprotocol://requestedproofs/' });
          return emitter;
        }
      );

    // Execute the requestProof method
    await Reclaim.requestProof(request, AppCallbackUrl);

    // Expectations
    expect(mockCanOpenURL).toHaveBeenCalledWith(expect.any(String));
    expect(mockOpenURL).toHaveBeenCalledWith(expect.any(String));
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'url',
      expect.any(Function)
    );

    // Clean up mocks
    mockCanOpenURL.mockRestore();
    mockOpenURL.mockRestore();
    mockAddEventListener.mockRestore();
  });
});
