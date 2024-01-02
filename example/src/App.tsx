import * as React from 'react';
import { registerRootComponent } from 'expo';
import { StyleSheet, View, Text } from 'react-native';
// import { Reclaim } from 'v2-reclaim-sdk-reactnative';

function App() {
  const [result, setResult] = React.useState<number | undefined>();

  React.useEffect(() => {
    setResult(3 * 7);
  }, []);

  return (
    <View style={styles.container}>
      <Text>Result: {result}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});

export default registerRootComponent(App);
