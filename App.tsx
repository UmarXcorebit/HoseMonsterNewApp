// In App.js in a new project

import * as React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navigation } from './src/navigation/index';








export default function App() {
  return (
    <SafeAreaProvider>
<Navigation/>
    </SafeAreaProvider>
  );
}
