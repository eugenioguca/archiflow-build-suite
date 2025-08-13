import React, { useEffect, useRef } from 'react';
import { generateAlertSound } from '@/utils/audioGenerator';

interface ChatNotificationSoundProps {
  enabled?: boolean;
  soundType?: 'soft' | 'professional' | 'loud' | 'icq';
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
  soundType = 'professional',
  volume = 0.6
}: ChatNotificationSoundProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Initialize audio element with programmatically generated sound
    const initializeAudio = async () => {
      try {
        // Create audio element
        const audio = new Audio();
        audioRef.current = audio;
        
        // Set volume
        audio.volume = Math.min(Math.max(volume, 0), 1);
        
        // Generate sound based on type
        await generateSound(soundType);
        
        // Make sound globally accessible
        window.playChatNotificationSound = () => {
          if (audioRef.current && enabled) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(console.error);
          }
        };
      } catch (error) {
        console.error('Error initializing chat notification sound:', error);
      }
    };

    const generateSound = async (type: string) => {
      try {
        await generateAlertSound(type as any);
      } catch (error) {
        console.error('Error generating chat notification sound:', error);
      }
    };

    initializeAudio();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      delete window.playChatNotificationSound;
    };
  }, [enabled, soundType, volume]);

  return null; // This component doesn't render anything
}

// Custom hook for using chat notification sound
export function useChatNotificationSound() {
  const playNotificationSound = () => {
    if (window.playChatNotificationSound) {
      window.playChatNotificationSound();
    } else {
      // Fallback to direct audio generation
      generateAlertSound('professional').catch(console.error);
    }
  };

  return {
    playNotificationSound
  };
}