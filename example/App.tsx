import React, {useEffect} from 'react';
import Section, {styles} from './Section';
import {Pressable, SafeAreaView, Text, View} from 'react-native';
import {ReclaimClient} from 'v2-reactnative-reclaim-sdk';
import type {
  Proof,
  RequestedProofs,
} from 'v2-reactnative-reclaim-sdk/lib/typescript/src/interfaces';

const APP_ID = '0xa1da33c9ed80e050130abe3482bc05ae82dab512';
const reclaimClient = new ReclaimClient(APP_ID);

function App(): React.JSX.Element {
  const [verificationReq, setVerificationReq] = React.useState<any>(null);
  const [extracted, setExtracted] = React.useState<any>(null);

  useEffect(() => {
    const getVerificationReq = async () => {
      const providers = ['Steam Username V2'];
      const appDeepLink = 'mychat://chat/';
      const PRIVATE_KEY =
        '016179b9820f8bb49972208e4ab4ef165bb57190888bff53e5f47c440696c13a';

      reclaimClient.setAppCallbackUrl(appDeepLink);

      const providerV2 = await reclaimClient.buildHttpProviderV2ByName(
        providers,
      );
      const requestProofs = await reclaimClient.buildRequestedProofs(
        providerV2,
        appDeepLink,
      );

      reclaimClient.setSignature(
        await getSignature(requestProofs, PRIVATE_KEY), // in prod, getSignature will retrieve signature from backend
      );

      const req = await reclaimClient.createVerificationRequest(providers);

      req.on('success', (data: Proof | unknown) => {
        if (data) {
          const proof = data as Proof;
          console.log('success', proof.extractedParameterValues);

          setExtracted(JSON.stringify(proof.extractedParameterValues));
        }
      });
      setVerificationReq(req);
    };

    const getSignature = async (
      requestProofs: RequestedProofs,
      appSecret: string,
    ) => {
      const signature = await reclaimClient.getSignature(
        requestProofs,
        appSecret,
      );
      return signature;
    };

    getVerificationReq();
  }, []);

  return (
    <SafeAreaView>
      <Section title="RECLAIM SDK @0.1.6 Demo" />
      <View>
        <Section title="Verify steam Username">
          <Pressable
            style={styles.button}
            onPress={async () => {
              await verificationReq.start();
            }}>
            <Text style={styles.sectionDescription}>Click Here!</Text>
          </Pressable>
        </Section>
        {extracted && (
          <Section title="Extracted Values">
            <Text style={styles.sectionTitle}>{JSON.stringify(extracted)}</Text>
          </Section>
        )}
      </View>
    </SafeAreaView>
  );
}

export default App;
