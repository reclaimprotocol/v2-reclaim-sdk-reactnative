import React from 'react';
import { StyleSheet, Text, View, Button } from 'react-native'; // Import Button component
import { StatusBar } from 'expo-status-bar';
import { useReclaim } from 'v2-reclaim-sdk-reactnative';

export default function App() {
  const { verify } = useReclaim();

  const handleVerify = () => {
    // Define your proof request here
    const customOpt = {
      title: 'Example Proof Request',
      contextMessage: 'Please provide the necessary proofs for verification.',
      contextAddress: '0x0',
    };

    // Perform the verification
    verify({
      providerIds: ['657dc04bde43d2886da5212b'],
      title: customOpt.title,
      contextMessage: customOpt.contextMessage,
      contextAddress: customOpt.contextAddress,
      privateKey: 'your_private_key', // Replace with your private key
      onSuccessCallback: (proofs) => {
        // Handle successful verification here
        console.log('Verification successful:', proofs);
      },
      onFailureCallback: (error) => {
        // Handle verification failure or errors here
        console.error('Verification failed:', error);
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
      <Button title="Verify" onPress={handleVerify} />{' '}
      {/* Add a Verify button */}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
