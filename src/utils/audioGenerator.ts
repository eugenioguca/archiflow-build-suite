// Audio generator for unique alert sounds
export const generateAlertSound = (type: 'soft' | 'professional' | 'loud' | 'uh-oh' | 'airport'): Promise<void> => {
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
          
        case 'airport':
          // Create classic airport announcement chime (ding-dong)
          const oscillator3 = audioContext.createOscillator();
          const gainNode3 = audioContext.createGain();
          
          oscillator3.connect(gainNode3);
          gainNode3.connect(audioContext.destination);
          
          // First chime "ding" - higher pitch, clear tone
          oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
          
          // Second chime "dong" - lower pitch with slight delay
          oscillator3.frequency.setValueAtTime(659, audioContext.currentTime + 0.5); // E5 note
          oscillator3.type = 'sine';
          gainNode3.gain.setValueAtTime(0.5, audioContext.currentTime + 0.5);
          gainNode3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.3);
          
          oscillator3.start(audioContext.currentTime + 0.5);
          oscillator3.stop(audioContext.currentTime + 1.3);
          break;
      }
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + (type === 'airport' ? 1.3 : 0.5));
      
      oscillator.onended = () => {
        audioContext.close();
        resolve();
      };
      
    } catch (error) {
      reject(error);
    }
  });
};