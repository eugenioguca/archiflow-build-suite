// Audio generator for unique alert sounds
export const generateAlertSound = (type: 'soft' | 'professional' | 'loud' | 'icq-message'): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure sound based on type
      switch (type) {
        case 'soft':
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A note
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          oscillator.type = 'sine';
          break;
          
        case 'professional':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Higher pitch
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.type = 'triangle';
          break;
          
        case 'loud':
          oscillator.frequency.setValueAtTime(1200, audioContext.currentTime); // Much higher pitch
          gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator.type = 'square';
          break;
          
        case 'icq-message':
          // Create a distinctive two-tone sound like ICQ
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime); // E note
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime + 0.1); // C note
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
          oscillator.type = 'sawtooth';
          break;
      }
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      oscillator.onended = () => {
        audioContext.close();
        resolve();
      };
      
    } catch (error) {
      reject(error);
    }
  });
};