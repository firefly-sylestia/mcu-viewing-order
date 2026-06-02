import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export const useAndroidNativeMode = () => {
  useEffect(() => {
    const root = document.documentElement;
    const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    const platform = Capacitor.getPlatform();

    root.classList.toggle('android-native', isNativeAndroid);
    document.body.classList.toggle('android-native', isNativeAndroid);
    root.dataset.platform = platform;
    root.dataset.native = String(Capacitor.isNativePlatform());

    return () => {
      root.classList.remove('android-native');
      document.body.classList.remove('android-native');
      delete root.dataset.platform;
      delete root.dataset.native;
    };
  }, []);
};
