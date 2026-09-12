import { useState, useEffect, useCallback } from 'react';

/**
 * useNowPlaying — detects and tracks live Spotify / system audio playback.
 */
export function useNowPlaying() {
  const [media, setMedia] = useState({
    isPlaying: false,
    title: '',
    artist: '',
    artwork: '',
    source: 'none',
  });

  useEffect(() => {
    // Fetch initial state
    window.electronAPI?.getNowPlaying?.().then((state) => {
      if (state && typeof state === 'object') {
        setMedia(state);
      }
    });

    // Subscribe to live push updates from main process
    const unsubscribe = window.electronAPI?.onNowPlaying?.((state) => {
      if (state && typeof state === 'object') {
        setMedia(state);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      } else {
        window.electronAPI?.removeAllListeners?.('now-playing-update');
      }
    };
  }, []);

  const playPause = useCallback(() => {
    window.electronAPI?.mediaControl?.('play-pause');
  }, []);

  const next = useCallback(() => {
    window.electronAPI?.mediaControl?.('next');
  }, []);

  const prev = useCallback(() => {
    window.electronAPI?.mediaControl?.('prev');
  }, []);

  return {
    ...media,
    playPause,
    next,
    prev,
  };
}
