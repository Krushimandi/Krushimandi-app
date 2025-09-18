import { useEffect, useRef, useState } from 'react';
import { Dimensions, Platform } from 'react-native';
import useKeyboardHeight from './useKeyboardHeight';

/**
 * Detects soft input layout behavior on Android: adjustResize vs adjustPan/none.
 * iOS is treated as 'resizeLike'. Provides stable layoutMode with debounce to avoid flicker
 * across quick keyboard show/hide cycles (some OEM keyboards emit transient sizes).
 */
export default function useKeyboardLayoutMode({ debounceMs = 80, stabilizeMs = 160 } = {}) {
  const { keyboardHeight, keyboardVisible } = useKeyboardHeight();
  const [rootHeight, setRootHeight] = useState(Dimensions.get('window').height);
  const initialRootHeightRef = useRef(null);
  const modeRef = useRef('unknown');
  const [layoutMode, setLayoutMode] = useState('unknown');
  const debounceTimerRef = useRef(null);
  const stabilizeTimerRef = useRef(null);
  const pendingNextRef = useRef(null);

  // Root onLayout handler to attach to top-level view
  const handleRootLayout = (e) => {
    const h = e.nativeEvent.layout.height;
    setRootHeight(h);
    if (initialRootHeightRef.current == null) {
      initialRootHeightRef.current = h;
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'android') {
      if (modeRef.current !== 'resizeLike') {
        modeRef.current = 'resizeLike';
        setLayoutMode('resizeLike');
      }
      return;
    }
    if (!keyboardVisible || keyboardHeight === 0) return;
    if (initialRootHeightRef.current == null) return;
    const initial = initialRootHeightRef.current;
    const loss = initial - rootHeight;
    const resizeThreshold = keyboardHeight * 0.5; // 50% of keyboard height
    const next = loss > resizeThreshold ? 'resize' : 'pan';

    // Hysteresis: if currently resize and next says pan but loss is borderline (<35% keyboard), ignore for now
    const borderline = keyboardHeight * 0.35;
    if (modeRef.current === 'resize' && next === 'pan' && loss > borderline) {
      // stay in resize to avoid oscillation
      return;
    }

    // Immediate first classification (avoid initial flicker)
    if (modeRef.current === 'unknown') {
      // classify resize immediately, but delay classifying pan until stabilization window
      if (next === 'resize') {
        modeRef.current = 'resize';
        setLayoutMode('resize');
      } else { // next is pan
        pendingNextRef.current = 'pan';
        if (!stabilizeTimerRef.current) {
          stabilizeTimerRef.current = setTimeout(() => {
            // re-measure intent: only commit if still pan
            if (pendingNextRef.current === 'pan') {
              modeRef.current = 'pan';
              setLayoutMode('pan');
            }
            stabilizeTimerRef.current = null;
          }, stabilizeMs);
        }
      }
      return;
    }

    if (next === modeRef.current) return;

    // If switching from resize->pan, require stabilization
    if (modeRef.current === 'resize' && next === 'pan') {
      pendingNextRef.current = 'pan';
      if (stabilizeTimerRef.current) return; // already waiting
      stabilizeTimerRef.current = setTimeout(() => {
        if (pendingNextRef.current === 'pan') {
          modeRef.current = 'pan';
          setLayoutMode('pan');
        }
        stabilizeTimerRef.current = null;
      }, stabilizeMs);
      return;
    }

    // pan->resize can upgrade immediately
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      modeRef.current = next;
      setLayoutMode(next);
    }, debounceMs);
  }, [keyboardVisible, keyboardHeight, rootHeight, debounceMs]);

  useEffect(() => () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (stabilizeTimerRef.current) clearTimeout(stabilizeTimerRef.current);
  }, []);

  const isResizeLike = Platform.OS !== 'android' || layoutMode === 'resize' || layoutMode === 'resizeLike' || layoutMode === 'unknown';
  return { layoutMode, modeRef, handleRootLayout, isResizeLike };
}
