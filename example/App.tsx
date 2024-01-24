/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect} from 'react';
import type {PropsWithChildren} from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {ReclaimClient} from 'v2-reactnative-reclaim-sdk';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import type {Proof} from 'v2-reactnative-reclaim-sdk/lib/typescript/src/interfaces';

type SectionProps = PropsWithChildren<{
  title: string;
}>;

const reclaimClient = new ReclaimClient('1');

function Section({children, title}: SectionProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>

      {children}
    </View>
  );
}

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [verificationReq, setVerificationReq] = React.useState<any>(null);

  const [extracted, setExtracted] = React.useState<any>(null);

  useEffect(() => {
    const getVerificationReq = async () => {
      reclaimClient.setAppCallbackUrl('mychat://chat/');
      const req = await reclaimClient.createVerificationRequest([
        'Steam ID v2',
      ]);
      req.on('success', (data: Proof | unknown) => {
        if (data) {
          const proof = data as Proof;
          console.log('success', proof.extractedParameterValues);

          setExtracted(JSON.stringify(proof.extractedParameterValues));
        }
      });
      setVerificationReq(req);
    };

    getVerificationReq();
  }, []);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <Section title="RECLAIM SDK @0.1.4 Demo" />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
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
              <Text style={styles.sectionTitle}>
                {JSON.stringify(extracted)}
              </Text>
            </Section>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 18,
    fontWeight: '400',
    padding: 10,
    color: '#fff',
    textAlign: 'center',
  },
  highlight: {
    fontWeight: '700',
  },
  button: {
    fontSize: 18,
    backgroundColor: 'gray',
    borderRadius: 8,
  },
});

export default App;
