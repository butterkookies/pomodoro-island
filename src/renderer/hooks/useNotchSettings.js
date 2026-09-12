import { useState, useCallback, useEffect } from 'react';

export const DEFAULT_NOTCH_SETTINGS = {
  idleEarWidth: 10,
  idleEarHeight: 9,
  activeEarWidth: 15,
  activeEarHeight: 14,
  idleHeight: 30,
  idleBottomRadius: 12,
};

export function useNotchSettings() {
  const [settings, setSettingsState] = useState(() => {
    const stored = window.electronAPI?.store?.get('notchSettings');
    if (stored && typeof stored === 'object') {
      return { ...DEFAULT_NOTCH_SETTINGS, ...stored };
    }
    return DEFAULT_NOTCH_SETTINGS;
  });

  useEffect(() => {
    window.electronAPI?.store?.set('notchSettings', settings);
  }, [settings]);

  const updateSetting = useCallback((key, value) => {
    setSettingsState((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettingsState(DEFAULT_NOTCH_SETTINGS);
  }, []);

  return {
    settings,
    updateSetting,
    resetToDefaults,
  };
}
