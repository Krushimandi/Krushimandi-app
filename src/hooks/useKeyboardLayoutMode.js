import { useEffect, useRef, useState, useCallback } from 'react';
import { Dimensions, Platform } from 'react-native';
import useKeyboardHeight from './useKeyboardHeight';

/**
 * Detects soft input layout behavior on Android: adjustResize vs adjustPan/none.
 * iOS is treated as 'resizeLike'. Provides stable layoutMode with debounce to avoid flicker
 * across quick keyboard show/hide cycles (some OEM keyboards emit transient sizes).
 * 
 * Supports all Android versions including Android 11+ edge-to-edge and various OEM keyboards.
 */
export default function useKeyboardLayoutMode({ debounceMs = 80, stabilizeMs = 160 } = {}) {
  const { keyboardHeight, keyboardVisible } = useKeyboardHeight();
  
  // State
  const [rootHeight, setRootHeight] = useState(() => Dimensions.get('window').height);
  const [layoutMode, setLayoutMode] = useState('unknown');
  
  // Refs for stable values across renders
  const initialRootHeightRef = useRef(null);
  const modeRef = useRef('unknown');
  const debounceTimerRef = useRef(null);
  const stabilizeTimerRef = useRef(null);
  const pendingNextRef = useRef(null);
  const lastClassifiedHeightRef = useRef(0);
  const isMountedRef = useRef(true);

  // Root onLayout handler to attach to top-level view - MEMOIZED
  const handleRootLayout = useCallback((e) => {
    const h = e.nativeEvent.layout.height;
    
    // Ignore negligible height changes (< 5px) to reduce noise
    if (Math.abs(h - rootHeight) < 5) return;
    
    setRootHeight(h);
    
    // Store initial height only once
    if (initialRootHeightRef.current === null) {
      initialRootHeightRef.current = h;
    }
  }, [rootHeight]);

  // Clear all timers helper
  const clearAllTimers = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (stabilizeTimerRef.current) {
      clearTimeout(stabilizeTimerRef.current);
      stabilizeTimerRef.current = null;
    }
  }, []);

  // Update layout mode helper
  const updateLayoutMode = useCallback((mode) => {
    if (!isMountedRef.current) return;
    if (modeRef.current === mode) return;
    
    modeRef.current = mode;
    setLayoutMode(mode);
  }, []);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // iOS always uses resize-like behavior
  useEffect(() => {
    if (Platform.OS !== 'android') {
      updateLayoutMode('resizeLike');
    }
  }, [updateLayoutMode]);

  // Android layout mode detection
  useEffect(() => {
    // Skip for non-Android platforms
    if (Platform.OS !== 'android') return;
    
    // Wait for keyboard to be visible with valid height
    if (!keyboardVisible || keyboardHeight === 0) {
      // Reset pending state when keyboard hides
      pendingNextRef.current = null;
      return;
    }
    
    // Wait for initial root height measurement
    if (initialRootHeightRef.current === null) return;

    const initial = initialRootHeightRef.current;
    const currentLoss = initial - rootHeight;
    
    // Avoid re-classifying if keyboard height hasn't changed significantly
    const heightDelta = Math.abs(keyboardHeight - lastClassifiedHeightRef.current);
    if (heightDelta < 20 && modeRef.current !== 'unknown') {
      return; // Skip classification for minor keyboard height changes
    }
    
    lastClassifiedHeightRef.current = keyboardHeight;

    // Classification thresholds (tuned for various Android versions and OEM keyboards)
    // adjustResize: window shrinks by ~keyboard height
    // adjustPan: window doesn't shrink (or shrinks minimally)
    const RESIZE_THRESHOLD = keyboardHeight * 0.5; // 50% of keyboard height
    const BORDERLINE_THRESHOLD = keyboardHeight * 0.35; // 35% borderline zone
    const MINIMAL_SHRINK = keyboardHeight * 0.15; // 15% minimal shrink for edge cases
    
    // Determine intended mode based on window height loss
    let intendedMode;
    
    if (currentLoss > RESIZE_THRESHOLD) {
      intendedMode = 'resize';
    } else if (currentLoss < MINIMAL_SHRINK) {
      // Very minimal shrink suggests adjustPan or adjustNothing
      intendedMode = 'pan';
    } else {
      // Borderline case (between 15-50%): maintain current mode if set, otherwise default to resize
      // This handles edge-to-edge Android 11+ and various navigation bar configurations
      intendedMode = modeRef.current !== 'unknown' ? modeRef.current : 'resize';
    }

    // Hysteresis: prevent oscillation in borderline cases
    if (modeRef.current === 'resize' && 
        intendedMode === 'pan' && 
        currentLoss > BORDERLINE_THRESHOLD) {
      // Stay in resize mode to avoid flickering
      return;
    }

    // Already in correct mode
    if (intendedMode === modeRef.current) {
      return;
    }

    // First-time classification
    if (modeRef.current === 'unknown') {
      if (intendedMode === 'resize') {
        // Classify as resize immediately (no flicker on adjustResize)
        updateLayoutMode('resize');
      } else {
        // For pan mode, wait for stabilization to avoid false positives
        pendingNextRef.current = 'pan';
        
        if (!stabilizeTimerRef.current) {
          stabilizeTimerRef.current = setTimeout(() => {
            if (!isMountedRef.current) return;
            
            // Commit to pan mode if still pending
            if (pendingNextRef.current === 'pan') {
              updateLayoutMode('pan');
            }
            
            stabilizeTimerRef.current = null;
            pendingNextRef.current = null;
          }, stabilizeMs);
        }
      }
      return;
    }

    // Mode transition: resize -> pan (requires stabilization)
    if (modeRef.current === 'resize' && intendedMode === 'pan') {
      pendingNextRef.current = 'pan';
      
      // Already waiting for stabilization
      if (stabilizeTimerRef.current) return;
      
      stabilizeTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        
        // Only commit if still intending pan mode
        if (pendingNextRef.current === 'pan') {
          updateLayoutMode('pan');
        }
        
        stabilizeTimerRef.current = null;
        pendingNextRef.current = null;
      }, stabilizeMs);
      
      return;
    }

    // Mode transition: pan -> resize (can upgrade immediately with debounce)
    if (modeRef.current === 'pan' && intendedMode === 'resize') {
      // Clear any pending timers
      clearAllTimers();
      pendingNextRef.current = null;
      
      // Apply debounce for smooth transition
      debounceTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        
        updateLayoutMode('resize');
        debounceTimerRef.current = null;
      }, debounceMs);
      
      return;
    }

    // Fallback: debounced mode change
    clearAllTimers();
    
    debounceTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      
      updateLayoutMode(intendedMode);
      debounceTimerRef.current = null;
    }, debounceMs);

  }, [
    keyboardVisible, 
    keyboardHeight, 
    rootHeight, 
    debounceMs, 
    stabilizeMs,
    updateLayoutMode,
    clearAllTimers
  ]);

  // Determine if current mode behaves like resize
  // 'unknown' defaults to resize-like for safety (prevents layout issues during detection)
  const isResizeLike = 
    Platform.OS !== 'android' || 
    layoutMode === 'resize' || 
    layoutMode === 'resizeLike' || 
    layoutMode === 'unknown';

  return { 
    layoutMode, 
    modeRef, 
    handleRootLayout, 
    isResizeLike 
  };
}