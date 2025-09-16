import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Screens
import GuessNumberScreen from './src/screens/CounterScreen';

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <GuessNumberScreen navigation={null} />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;