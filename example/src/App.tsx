// // App.js
// import React, { useEffect } from 'react';
// import { StyleSheet, Text, View } from 'react-native';
// import { StatusBar } from 'expo-status-bar';
// import { useReclaim } from 'v2-reclaim-sdk-reactnative';

// export default function App() {
//   const { requestProof } = useReclaim();

//   useEffect(() => {
//     // Simulate a proof request on component mount
//     const proofRequest = {
//       title: 'Example Proof Request',
//       requestedProofs: [
//         {
//           name: 'ProviderName',
//           logoUrl: 'https://provider-logo-url.com/logo.png',
//           description: 'Provider description',
//         },
//       ],
//       contextMessage: 'Please provide the necessary proofs for verification.',
//       contextAddress: '0x0',
//       requestorSignature: 'your_requestor_signature', // Provide the actual signature
//     };

//     const AppCallbackUrl = 'your_callback_url';

//     requestProof(proofRequest);
//   }, [requestProof]); // Empty dependency array ensures that the effect runs once on component mount

//   return (
//     <View style={styles.container}>
//       <Text>Open up App.js to start working on your app!</Text>
//       {/* {deepLinkData && (
//         <Text>Deep Link Data Received: {JSON.stringify(deepLinkData)}</Text>
//       )} */}
//       <StatusBar style="auto" />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });
