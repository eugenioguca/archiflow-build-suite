// Audio generator for unique alert sounds
export const generateAlertSound = (type: 'soft' | 'professional' | 'loud' | 'uh-oh'): Promise<void> => {
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
          
        case 'uh-oh':
          // Create the classic ICQ "uh-oh" sound with two distinct tones
          const oscillator2 = audioContext.createOscillator();
          const gainNode2 = audioContext.createGain();
          
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          
          // First tone "uh" - lower pitch
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A note
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          
          // Second tone "oh" - higher pitch with slight delay
          oscillator2.frequency.setValueAtTime(330, audioContext.currentTime + 0.18); // E note
          oscillator2.type = 'sine';
          gainNode2.gain.setValueAtTime(0.4, audioContext.currentTime + 0.18);
          gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
          
          oscillator2.start(audioContext.currentTime + 0.18);
          oscillator2.stop(audioContext.currentTime + 0.35);
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