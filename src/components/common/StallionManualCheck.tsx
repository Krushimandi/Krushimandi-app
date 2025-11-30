import React from 'react';
import { TouchableOpacity, Text, View, Alert } from 'react-native';
import { useStallionUpdate, restart } from 'react-native-stallion';

const StallionManualCheck: React.FC = () => {
  const { isRestartRequired, currentlyRunningBundle, newReleaseBundle } = useStallionUpdate();

  const handleManualCheck = () => {
    const debugInfo = {
      hasUpdate: isRestartRequired,
      currentVersion: currentlyRunningBundle?.version || 'Unknown',
      newVersion: newReleaseBundle?.version || 'None',
      newBundleId: newReleaseBundle?.id || 'None',
      isPromoted: newReleaseBundle?.isPromoted || false,
      isMandatory: newReleaseBundle?.isMandatory || false,
    };

    Alert.alert(
      'Stallion Update Status',
      `Update Available: ${isRestartRequired ? 'YES' : 'NO'}\n` +
      `Current Version: ${debugInfo.currentVersion}\n` +
      `New Version: ${debugInfo.newVersion}\n` +
      `Bundle ID: ${debugInfo.newBundleId}\n` +
      `Is Promoted: ${debugInfo.isPromoted}\n` +
      `Is Mandatory: ${debugInfo.isMandatory}`,
      [
        { text: 'OK' },
        ...(isRestartRequired ? [{
          text: 'Restart Now',
          onPress: () => restart()
        }] : [])
      ]
    );

    console.log('🐎 Manual Stallion Check:', debugInfo);
  };

  return (
    <View style={{ margin: 10 }}>
      <TouchableOpacity 
        onPress={handleManualCheck}
        style={{
          backgroundColor: isRestartRequired ? '#FF6B35' : '#4A90E2',
          padding: 12,
          borderRadius: 8,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          {isRestartRequired ? '🔄 Update Ready!' : '🐎 Check Stallion Status'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default StallionManualCheck;