import { useState, useCallback, useLayoutEffect, useEffect } from 'react';
import { THEME_PALETTES, DEFAULT_THEME_ID } from '../../shared/constants.js';

export function getValidTheme(themeId) {
  if (themeId && THEME_PALETTES[themeId]) {
    return THEME_PALETTES[themeId];
  }
  return THEME_PALETTES[DEFAULT_THEME_ID];
}

export function applyThemeTokensToElement(element, theme) {
  if (!element?.style?.setProperty || !theme) return;
  element.style.setProperty('--accent-bar', theme.primary);
  element.style.setProperty('--accent-bar-hover', theme.hover);
  element.style.setProperty('--accent-bar-light', theme.light);
  element.style.setProperty('--accent-bar-gradient', theme.gradient);
  element.style.setProperty('--accent-bar-gradient-h', theme.swatchGradient);
  element.style.setProperty('--accent-bar-glow', theme.glow);
}

// Helper hook that safely uses useLayoutEffect on client or useEffect on server
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useAccentTheme() {
  const [themeId, setThemeIdState] = useState(() => {
    const stored = window.electronAPI?.store?.get('accentTheme');
    return stored && THEME_PALETTES[stored] ? stored : DEFAULT_THEME_ID;
  });

  const activeTheme = getValidTheme(themeId);

  // Apply CSS custom properties synchronously before paint
  useIsomorphicLayoutEffect(() => {
    if (typeof document !== 'undefined') {
      applyThemeTokensToElement(document.documentElement, activeTheme);
    }
  }, [activeTheme]);

  const setAccentTheme = useCallback((newId) => {
    if (THEME_PALETTES[newId]) {
      setThemeIdState(newId);
      window.electronAPI?.store?.set('accentTheme', newId);
    }
  }, []);

  return {
    themeId,
    theme: activeTheme,
    setAccentTheme,
    themes: THEME_PALETTES,
  };
}
