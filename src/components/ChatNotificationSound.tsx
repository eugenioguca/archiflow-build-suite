import React, { useEffect, useRef } from 'react';
import { generateAlertSound } from '@/utils/audioGenerator';

interface ChatNotificationSoundProps {
  enabled?: boolean;
  soundType?: 'soft' | 'professional' | 'loud' | 'chat';
  volume?: number;
}

// Global function to play sound from anywhere
declare global {
  interface Window {
    playChatNotificationSound?: () => void;
  }
}

export function ChatNotificationSound({ 
  enabled = true, 
  soundType = 'chat',
  volume = 0.6
}: ChatNotificationSoundProps) {
  useEffect(() => {
    if (!enabled) return;

    // Make sound globally accessible without pre-generating audio
    window.playChatNotificationSound = () => {
      if (enabled) {
        generateAlertSound(soundType as any).catch(console.error);
      }
    };

    return () => {
      delete window.playChatNotificationSound;
    };
  }, [enabled, soundType]);

  return null; // This component doesn't render anything
}

// Custom hook for using chat notification sound
export function useChatNotificationSound() {
  const playNotificationSound = () => {
    if (window.playChatNotificationSound) {
      window.playChatNotificationSound();
    } else {
      // Fallback to direct audio generation with chat sound
      generateAlertSound('chat').catch(console.error);
    }
  };

  return {
    playNotificationSound
  };
}