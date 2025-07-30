import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';

export const useCapacitor = () => {
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<string>('web');

  useEffect(() => {
    const initializeCapacitor = async () => {
      const native = Capacitor.isNativePlatform();
      const currentPlatform = Capacitor.getPlatform();
      
      setIsNative(native);
      setPlatform(currentPlatform);

      if (native) {
        // Configure status bar
        if (Capacitor.isPluginAvailable('StatusBar')) {
          await StatusBar.setStyle({ style: Style.Default });
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
        }

        // Hide splash screen after initialization
        if (Capacitor.isPluginAvailable('SplashScreen')) {
          setTimeout(() => {
            SplashScreen.hide();
          }, 2000);
        }

        // Handle keyboard
        if (Capacitor.isPluginAvailable('Keyboard')) {
          Keyboard.addListener('keyboardWillShow', () => {
            document.body.classList.add('keyboard-open');
          });

          Keyboard.addListener('keyboardWillHide', () => {
            document.body.classList.remove('keyboard-open');
          });
        }

        // Handle app state changes
        if (Capacitor.isPluginAvailable('App')) {
          App.addListener('appStateChange', ({ isActive }) => {
            console.log('App state changed. Is active?', isActive);
          });

          App.addListener('backButton', () => {
            // Handle back button on Android
            if (window.history.length > 1) {
              window.history.back();
            } else {
              App.exitApp();
            }
          });
        }
      }
    };

    initializeCapacitor();

    return () => {
      // Cleanup listeners
      if (isNative) {
        Keyboard.removeAllListeners();
        App.removeAllListeners();
      }
    };
  }, []);

  const setStatusBarStyle = async (style: Style) => {
    if (isNative && Capacitor.isPluginAvailable('StatusBar')) {
      await StatusBar.setStyle({ style });
    }
  };

  const hideKeyboard = async () => {
    if (isNative && Capacitor.isPluginAvailable('Keyboard')) {
      await Keyboard.hide();
    }
  };

  const exitApp = async () => {
    if (isNative && Capacitor.isPluginAvailable('App')) {
      await App.exitApp();
    }
  };

  return {
    isNative,
    platform,
    setStatusBarStyle,
    hideKeyboard,
    exitApp
  };
};