import { useEffect, useRef, useState } from 'react';
import { Animated, EmitterSubscription, Keyboard, Platform } from 'react-native';

/**
 * Cross-platform keyboard height + visibility tracking with an Animated value.
 * Works with both iOS (will*) and Android (did*) events.
 * Avoids double applying layout shifts when using adjustResize on Android by
 * letting consumer decide if they want to offset absolutely positioned elements.
 */
export function useKeyboardHeight(options = {}) {
  const { enableLayoutAnimation = true, durationOverride } = options;
  const keyboardHeightAnimated = useRef(new Animated.Value(0)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      const h = e?.endCoordinates?.height || 0;
      setKeyboardVisible(true);
      setKeyboardHeight(h);
      if (enableLayoutAnimation) {
        Animated.timing(keyboardHeightAnimated, {
          toValue: h,
          duration: durationOverride || e?.duration || 250,
          useNativeDriver: false,
        }).start();
      } else {
        keyboardHeightAnimated.setValue(h);
      }
    };

    const onHide = (e) => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      if (enableLayoutAnimation) {
        Animated.timing(keyboardHeightAnimated, {
          toValue: 0,
            duration: durationOverride || e?.duration || 200,
            useNativeDriver: false,
          }).start();
      } else {
        keyboardHeightAnimated.setValue(0);
      }
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub?.remove();
      hideSub?.remove();
    };
  }, [enableLayoutAnimation, durationOverride, keyboardHeightAnimated]);

  return { keyboardHeightAnimated, keyboardHeight, keyboardVisible };
}

export default useKeyboardHeight;
