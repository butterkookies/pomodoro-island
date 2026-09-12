import { useState, useCallback, useEffect } from 'react';

/**
 * useTasks — manages the active focus goal and quick-capture scratchpad notes.
 */
export function useTasks() {
  const [activeTask, setActiveTaskState] = useState(() => {
    return window.electronAPI?.store?.get('activeTask', '') || '';
  });

  const [scratchpadNotes, setNotesState] = useState(() => {
    const stored = window.electronAPI?.store?.get('scratchpadNotes');
    return Array.isArray(stored) ? stored : [];
  });

  useEffect(() => {
    window.electronAPI?.store?.set('activeTask', activeTask);
  }, [activeTask]);

  useEffect(() => {
    window.electronAPI?.store?.set('scratchpadNotes', scratchpadNotes);
  }, [scratchpadNotes]);

  const setActiveTask = useCallback((task) => {
    setActiveTaskState(task ?? '');
  }, []);

  const addNote = useCallback((text) => {
    if (!text || !text.trim()) return;
    const note = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: text.trim(),
      createdAt: Date.now(),
      done: false,
    };
    setNotesState((prev) => [note, ...prev]);
  }, []);

  const toggleNote = useCallback((id) => {
    setNotesState((prev) =>
      prev.map((n) => (n.id === id ? { ...n, done: !n.done } : n))
    );
  }, []);

  const removeNote = useCallback((id) => {
    setNotesState((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearCompletedNotes = useCallback(() => {
    setNotesState((prev) => prev.filter((n) => !n.done));
  }, []);

  return {
    activeTask,
    setActiveTask,
    scratchpadNotes,
    addNote,
    toggleNote,
    removeNote,
    clearCompletedNotes,
  };
}
