import { useState, useCallback } from 'react';
import { useStallionUpdate, restart } from 'react-native-stallion';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

interface UseStallionUpdateControllerReturn {
  /**
   * Whether an update is available and needs restart
   */
  isUpdateAvailable: boolean;
  
  /**
   * Whether the update is mandatory
   */
  isMandatoryUpdate: boolean;
  
  /**
   * Current bundle metadata
   */
  currentBundle: any;
  
  /**
   * New bundle metadata (if available)
   */
  newBundle: any;
  
  /**
   * Whether restart is in progress
   */
  isRestarting: boolean;
  
  /**
   * Manually trigger app restart to apply update
   */
  applyUpdate: () => Promise<void>;
  
  /**
   * Show update information in an alert
   */
  showUpdateInfo: () => void;
  
  /**
   * Check for updates and show status
   */
  checkForUpdates: () => void;
}

/**
 * Hook to manage Stallion updates with manual controls
 */
export const useStallionUpdateController = (): UseStallionUpdateControllerReturn => {
  const { t } = useTranslation();
  const { isRestartRequired, currentlyRunningBundle, newReleaseBundle } = useStallionUpdate();
  const [isRestarting, setIsRestarting] = useState(false);

  const applyUpdate = useCallback(async (): Promise<void> => {
    if (!isRestartRequired || !newReleaseBundle) {
      return;
    }

    try {
      setIsRestarting(true);
      
      if (newReleaseBundle.isMandatory) {
        Alert.alert(
          t('updates.mandatoryTitle', 'Mandatory Update'),
          t('updates.mandatoryMessage', 'This update is required and the app will restart automatically.'),
          [
            {
              text: t('common.ok', 'OK'),
              onPress: () => restart()
            }
          ],
          { cancelable: false }
        );
      } else {
        Alert.alert(
          t('updates.updateAvailableTitle', 'Update Available'),
          newReleaseBundle.releaseNote || t('updates.defaultMessage', 'A new update is ready!'),
          [
            {
              text: t('common.cancel', 'Cancel'),
              style: 'cancel',
              onPress: () => setIsRestarting(false)
            },
            {
              text: t('updates.restartNow', 'Restart Now'),
              onPress: () => restart()
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Update application failed:', error);
      setIsRestarting(false);
      Alert.alert(
        t('updates.restartErrorTitle', 'Update Error'),
        t('updates.restartErrorMessage', 'Failed to apply update. Please try again.'),
        [{ text: t('common.ok', 'OK') }]
      );
    }
  }, [isRestartRequired, newReleaseBundle, t]);

  const showUpdateInfo = useCallback(() => {
    if (isRestartRequired && newReleaseBundle) {
      const message = [
        newReleaseBundle.releaseNote || t('updates.defaultMessage', 'A new update is ready!'),
        '',
        `${t('updates.version', 'Version')}: ${newReleaseBundle.version}`,
        newReleaseBundle.size ? `${t('updates.size', 'Size')}: ${(newReleaseBundle.size / 1024 / 1024).toFixed(1)} MB` : null,
        newReleaseBundle.author ? `${t('updates.author', 'By')}: ${newReleaseBundle.author}` : null,
      ].filter(Boolean).join('\n');

      Alert.alert(
        newReleaseBundle.isMandatory 
          ? t('updates.mandatoryTitle', 'Mandatory Update')
          : t('updates.updateAvailableTitle', 'Update Available'),
        message,
        [
          ...(newReleaseBundle.isMandatory ? [] : [
            {
              text: t('updates.later', 'Later'),
              style: 'cancel' as const
            }
          ]),
          {
            text: t('updates.restartNow', 'Restart Now'),
            onPress: applyUpdate
          }
        ]
      );
    } else {
      Alert.alert(
        t('updates.updateAvailableTitle', 'Update Status'),
        'You are running the latest version of the app.',
        [{ text: t('common.ok', 'OK') }]
      );
    }
  }, [isRestartRequired, newReleaseBundle, applyUpdate, t]);

  const checkForUpdates = useCallback(() => {
    // Stallion automatically checks for updates, so we just show current status
    if (isRestartRequired && newReleaseBundle) {
      showUpdateInfo();
    } else {
      Alert.alert(
        'Up to Date',
        'You are running the latest version of the app.',
        [{ text: t('common.ok', 'OK') }]
      );
    }
  }, [isRestartRequired, newReleaseBundle, showUpdateInfo, t]);

  return {
    isUpdateAvailable: isRestartRequired,
    isMandatoryUpdate: Boolean(newReleaseBundle?.isMandatory),
    currentBundle: currentlyRunningBundle,
    newBundle: newReleaseBundle,
    isRestarting,
    applyUpdate,
    showUpdateInfo,
    checkForUpdates,
  };
};