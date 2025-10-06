/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { name as appName } from './app.json';
import App from './App';

const Root = () => (
	<SafeAreaProvider initialMetrics={initialWindowMetrics}>
		<App />
	</SafeAreaProvider>
);

AppRegistry.registerComponent(appName, () => Root);