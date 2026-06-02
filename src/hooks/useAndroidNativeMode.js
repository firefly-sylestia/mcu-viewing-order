import { useEffect } from 'react';

export const useAndroidNativeMode = () => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('android-native');
    document.body.classList.remove('android-native');
    root.dataset.platform = 'web';
    root.dataset.native = 'false';

    return () => {
      root.classList.remove('android-native');
      document.body.classList.remove('android-native');
      delete root.dataset.platform;
      delete root.dataset.native;
    };
  }, []);
};
