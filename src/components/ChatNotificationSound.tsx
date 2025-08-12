import { useEffect, useRef } from 'react';

interface ChatNotificationSoundProps {
  enabled?: boolean;
  soundType?: 'soft' | 'professional' | 'loud' | 'icq';
  volume?: number;
}

export const ChatNotificationSound: React.FC<ChatNotificationSoundProps> = ({
  enabled = true,
  soundType = 'soft',
  volume = 0.5
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Mapear tipos de sonido a archivos
    const soundFiles = {
      soft: '/sounds/soft-alert.mp3',
      professional: '/sounds/professional-alert.mp3',
      loud: '/sounds/loud-alert.mp3',
      icq: '/sounds/icq-message.mp3'
    };

    // Crear elemento de audio
    audioRef.current = new Audio(soundFiles[soundType]);
    audioRef.current.volume = Math.max(0, Math.min(1, volume));
    
    // Precargar el audio
    audioRef.current.load();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [enabled, soundType, volume]);

  const playSound = () => {
    if (!enabled || !audioRef.current) return;

    try {
      // Resetear el audio al inicio
      audioRef.current.currentTime = 0;
      
      // Reproducir con manejo de errores
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Manejar errores de reproducción (ej. usuario no ha interactuado)
          console.warn('No se pudo reproducir el sonido de notificación:', error);
        });
      }
    } catch (error) {
      console.warn('Error al reproducir sonido de notificación:', error);
    }
  };

  // Exponer la función play para uso externo
  useEffect(() => {
    (window as any).playChatNotificationSound = playSound;
    
    return () => {
      delete (window as any).playChatNotificationSound;
    };
  }, []);

  return null; // Este componente no renderiza nada visible
};

// Hook para usar el sonido de notificación
export const useChatNotificationSound = (options?: ChatNotificationSoundProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { enabled = true, soundType = 'soft', volume = 0.5 } = options || {};

  useEffect(() => {
    if (!enabled) return;

    const soundFiles = {
      soft: '/sounds/soft-alert.mp3',
      professional: '/sounds/professional-alert.mp3',
      loud: '/sounds/loud-alert.mp3',
      icq: '/sounds/icq-message.mp3'
    };

    audioRef.current = new Audio(soundFiles[soundType]);
    audioRef.current.volume = Math.max(0, Math.min(1, volume));
    audioRef.current.load();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [enabled, soundType, volume]);

  const playNotificationSound = () => {
    if (!enabled || !audioRef.current) return;

    try {
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('No se pudo reproducir el sonido de notificación:', error);
        });
      }
    } catch (error) {
      console.warn('Error al reproducir sonido de notificación:', error);
    }
  };

  return { playNotificationSound };
};