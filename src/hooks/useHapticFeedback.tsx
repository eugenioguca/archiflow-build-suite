import { Capacitor } from '@capacitor/core';

export function useHapticFeedback() {
  const isNative = Capacitor.isNativePlatform();

  const triggerImpact = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    // Web vibration fallback
    if ('vibrate' in navigator) {
      const duration = style === 'light' ? 10 : style === 'medium' ? 20 : 50;
      navigator.vibrate(duration);
    }
  };

  const triggerSelection = () => {
    // Web vibration fallback
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  };

  return {
    triggerImpact,
    triggerSelection
  };
}