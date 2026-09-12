import { useState, useCallback, useRef, useEffect } from 'react';
import { playNotchSpring } from '../utils/soundManager';

/**
 * Manages the three-state pill interaction model:
 *   idle → compact → expanded
 *
 * - idle:     mouse far from pill — minimal dark sliver, click-through ON
 * - compact:  mouse enters pill — hover-glance showing mini info
 * - expanded: click on compact — full controls visible
 *
 * Uses mousemove tracking instead of mouseenter/mouseleave to avoid the
 * phantom-leave issue caused by toggling setIgnoreMouseEvents on Windows.
 *
 * Transitions:
 *   idle ──[mouse over island]──→ compact
 *   compact ──[click]──→ expanded
 *   compact ──[mouse leaves island area]──→ idle
 *   expanded: stays open until user clicks collapse, presses Esc, or toggles
 */
export function useIslandState(options = {}) {
    const { preventIdle = false } = options;
    const [state, setState] = useState('compact'); // 'idle' | 'compact' | 'expanded'
    const stateRef = useRef('compact');
    const prevStateRef = useRef('compact');
    const leaveTimerRef = useRef(null);
    const islandRef = useRef(null); // attached to the island DOM node
    const preventIdleRef = useRef(preventIdle);

    useEffect(() => {
        preventIdleRef.current = preventIdle;
        if (preventIdle) {
            clearTimeout(leaveTimerRef.current);
            leaveTimerRef.current = null;
        }
    }, [preventIdle]);

    // Wrapped safeSetState declared first to prevent TDZ errors
    const safeSetState = useCallback((newState) => {
        clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
        if (newState === 'idle') {
            window.electronAPI?.setClickThrough(true);
        } else {
            window.electronAPI?.setClickThrough(false);
        }
        setState(newState);
    }, []);

    // Keep ref in sync & play spring acoustic
    useEffect(() => {
        if (prevStateRef.current !== state) {
            const isSoundEnabled = window.electronAPI?.store?.get('soundEffectsEnabled') ?? true;
            if (isSoundEnabled) {
                if (state === 'expanded') {
                    playNotchSpring(true);
                } else if (prevStateRef.current === 'expanded') {
                    playNotchSpring(false);
                }
            }
            prevStateRef.current = state;
        }
        stateRef.current = state;
    }, [state]);

    // Show compact island on initial launch so the user immediately sees it,
    // then auto-settle into idle after 3.5s unless hovered.
    useEffect(() => {
        const introTimer = setTimeout(() => {
            if (stateRef.current === 'compact') {
                safeSetState('idle');
            }
        }, 3500);
        return () => clearTimeout(introTimer);
    }, [safeSetState]);

    // ── Core: mousemove-based hover detection ──────────────
    useEffect(() => {
        function onMouseMove(e) {
            const el = islandRef.current;
            if (!el) return;

            const rect = el.getBoundingClientRect();
            const padX = 16;
            const padY = 8;
            const inside =
                e.clientX >= rect.left - padX &&
                e.clientX <= rect.right + padX &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom + padY;

            if (inside) {
                // Mouse is over the island — cancel any pending leave
                clearTimeout(leaveTimerRef.current);
                leaveTimerRef.current = null;

                if (stateRef.current === 'idle') {
                    safeSetState('compact');
                }
            } else {
                // Mouse left the island area.
                // Only compact (glance) view auto-settles to idle.
                // Expanded view stays open for user interaction until collapsed.
                if (stateRef.current === 'compact' && leaveTimerRef.current === null && !preventIdleRef.current) {
                    leaveTimerRef.current = setTimeout(() => {
                        leaveTimerRef.current = null;
                        if (!preventIdleRef.current) {
                            safeSetState('idle');
                        }
                    }, 350);
                }
            }
        }

        document.addEventListener('mousemove', onMouseMove);
        return () => document.removeEventListener('mousemove', onMouseMove);
    }, [safeSetState]);

    // ── Direct IPC trigger from main process hover-zone detection ──
    useEffect(() => {
        window.electronAPI?.onCursorEnterIsland(() => {
            clearTimeout(leaveTimerRef.current);
            leaveTimerRef.current = null;
            if (stateRef.current === 'idle') {
                safeSetState('compact');
            }
        });

        window.electronAPI?.onToggleExpand(() => {
            clearTimeout(leaveTimerRef.current);
            leaveTimerRef.current = null;
            if (stateRef.current === 'expanded') {
                safeSetState('compact');
            } else {
                safeSetState('expanded');
            }
        });

        function onKeyDown(e) {
            if (e.key === 'Escape') {
                if (stateRef.current === 'expanded') {
                    safeSetState('compact');
                }
            }
        }
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.electronAPI?.removeAllListeners?.('cursor-enter-island');
            window.electronAPI?.removeAllListeners?.('toggle-expand');
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [safeSetState]);

    // Fallback: if the mouse leaves the window entirely
    useEffect(() => {
        function onDocLeave() {
            if (stateRef.current === 'compact') {
                clearTimeout(leaveTimerRef.current);
                leaveTimerRef.current = setTimeout(() => {
                    leaveTimerRef.current = null;
                    safeSetState('idle');
                }, 350);
            }
        }
        document.addEventListener('mouseleave', onDocLeave);
        return () => document.removeEventListener('mouseleave', onDocLeave);
    }, [safeSetState]);

    const handleClick = useCallback(() => {
        if (stateRef.current === 'compact') {
            safeSetState('expanded');
        }
    }, [safeSetState]);

    // Report island element bounds to main so it can do precise click-through
    useEffect(() => {
        if (state === 'idle') return;
        const el = islandRef.current;
        if (!el) return;

        function report() {
            const rect = el.getBoundingClientRect();
            window.electronAPI?.updateIslandBounds({
                left: rect.left - 20,
                top: rect.top,
                right: rect.right + 20,
                bottom: rect.bottom + 76,
            });
        }

        report();
        const ro = new ResizeObserver(report);
        ro.observe(el);
        return () => ro.disconnect();
    }, [state]);

    // Cleanup on unmount
    useEffect(() => {
        return () => clearTimeout(leaveTimerRef.current);
    }, []);

    return {
        state,
        setState: safeSetState,
        islandRef,
        handleClick,
        handleMouseEnter: () => {},
        handleMouseLeave: () => {},
    };
}
