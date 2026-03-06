import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useStallionUpdate, restart } from 'react-native-stallion';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StallionUpdatePromptProps {
    /**
     * Enable silent automatic updates without user intervention
     * Updates are downloaded in background and applied on next app launch
     */
    silentUpdate?: boolean;
}

const StallionUpdatePrompt: React.FC<StallionUpdatePromptProps> = ({
    silentUpdate = true, // Enable silent updates by default
}) => {
    const { isRestartRequired, currentlyRunningBundle, newReleaseBundle } = useStallionUpdate();
    const [silentUpdateProcessed, setSilentUpdateProcessed] = useState(false);

    // Silent update handler - processes updates automatically without UI
    const handleSilentUpdate = useCallback(async () => {
        if (!silentUpdate || !isRestartRequired || silentUpdateProcessed) {
            return;
        }

        try {
            setSilentUpdateProcessed(true);
            
            // Store update info for logging
            const updateInfo = {
                version: newReleaseBundle?.version || 'unknown',
                timestamp: Date.now(),
                size: newReleaseBundle?.size || 0,
                isMandatory: newReleaseBundle?.isMandatory || false,
            };

            await AsyncStorage.setItem('stallion_silent_update_info', JSON.stringify(updateInfo));
            
            console.log('🔄 Applying silent update:', updateInfo);
            
            // Apply update silently - this will restart the app automatically
            // The restart happens immediately and seamlessly
            restart();
            
        } catch (error) {
            console.error('❌ Silent update failed:', error);
            setSilentUpdateProcessed(false);
        }
    }, [silentUpdate, isRestartRequired, silentUpdateProcessed, newReleaseBundle]);

    // Handle silent updates automatically — restart only when app is backgrounded
    const pendingRestartRef = useRef(false);

    useEffect(() => {
        if (silentUpdate && isRestartRequired && !silentUpdateProcessed) {
            pendingRestartRef.current = true;
        }
    }, [silentUpdate, isRestartRequired, silentUpdateProcessed]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            if (
                (nextState === 'background' || nextState === 'inactive') &&
                pendingRestartRef.current
            ) {
                // Restart while app is in background — no visible interruption for the user
                handleSilentUpdate();
            }
        });

        return () => subscription.remove();
    }, [handleSilentUpdate]);

    // Log successful silent updates (for debugging)
    useEffect(() => {
        const logSilentUpdate = async () => {
            try {
                const storedInfo = await AsyncStorage.getItem('stallion_silent_update_info');
                if (storedInfo) {
                    const updateInfo = JSON.parse(storedInfo);
                    console.log('✅ Silent update completed successfully:', updateInfo);
                    
                    // Clear the stored info after logging
                    await AsyncStorage.removeItem('stallion_silent_update_info');
                }
            } catch (error) {
                console.warn('⚠️ Failed to log silent update:', error);
            }
        };

        // Only log when app starts and no update is required (meaning update was applied)
        if (!isRestartRequired && currentlyRunningBundle) {
            logSilentUpdate();
        }
    }, [isRestartRequired, currentlyRunningBundle]);

    // Silent updates don't render any UI
    return null;
};

export default StallionUpdatePrompt;