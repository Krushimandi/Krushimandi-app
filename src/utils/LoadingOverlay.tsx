/**
 * LoadingOverlay Utility
 * Reusable full-screen loading overlay with transparent black background
 */
import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Modal,
  StatusBar,
  Text,
} from 'react-native';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  spinnerColor?: string;
  spinnerSize?: 'small' | 'large';
  backgroundColor?: string;
  opacity?: number;
}

/**
 * Full-screen loading overlay component
 * 
 * @example
 * ```tsx
 * <LoadingOverlay visible={isLoading} message="Processing..." />
 * ```
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
  spinnerColor = '#FFFFFF',
  spinnerSize = 'large',
  backgroundColor = '#000000',
  opacity = 0.7,
}) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Prevent closing by back button during loading
      }}
    >
      <StatusBar backgroundColor="rgba(0, 0, 0, 0.7)" />
      <View style={[styles.overlay, { backgroundColor: `${backgroundColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` }]}>
        <View style={styles.container}>
          <ActivityIndicator
            size={spinnerSize}
            color={spinnerColor}
            style={styles.spinner}
          />
          {message && (
            <Text style={[styles.message, { color: spinnerColor }]}>
              {message}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 8,
  },
});

export default LoadingOverlay;
