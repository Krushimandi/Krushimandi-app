import { useSharedValue, withSpring } from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Custom hook that creates a keyboard spacer using React Native's Keyboard API
 * and react-native-reanimated for smooth keyboard handling.
 * 
 * Returns an animated height value that equals keyboard height when keyboard is open,
 * and 0 when keyboard is closed. This can be used with Animated.View to push
 * content above the keyboard.
 */
export const useKeyboardSpacer = () => {
  const keyboardSpacerHeight = useSharedValue(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (e) => {
      const height = e?.endCoordinates?.height || 0;
      setKeyboardHeight(height);
      setIsKeyboardVisible(true);
      
      // Use spring animation for smooth transitions
      keyboardSpacerHeight.value = withSpring(height, {
        damping: 15,
        stiffness: 150,
        mass: 1,
        overshootClamping: false,
        restSpeedThreshold: 0.01,
        restDisplacementThreshold: 0.01,
      });
    };

    const onKeyboardHide = () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
      
      // Animate back to 0
      keyboardSpacerHeight.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
        mass: 1,
        overshootClamping: false,
        restSpeedThreshold: 0.01,
        restDisplacementThreshold: 0.01,
      });
    };

    const showSubscription = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, [keyboardSpacerHeight]);

  return {
    keyboardSpacerHeight,
    isKeyboardVisible,
    keyboardHeight,
  };
};

export default useKeyboardSpacer;