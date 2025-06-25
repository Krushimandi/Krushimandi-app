/**
 * KrushiMandi App
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RNBootSplash from 'react-native-bootsplash';
import { AppNavigator } from './src/navigation';
import { Colors } from './src/constants';
import './global.css';
import './src/config/firebase';

const App: React.FC = () => {
    const isDark = false;    useEffect(() => {

        const init = async () => {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }; 
        
        init().finally(async () => {
            await RNBootSplash.hide({ fade: true });
        });
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={isDark ? Colors.dark.background : Colors.light.background}
                translucent
            />
            <AppNavigator />
        </GestureHandlerRootView>
    );
};

export default App;
