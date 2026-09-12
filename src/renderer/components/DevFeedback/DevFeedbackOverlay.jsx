import { useState, useEffect, useCallback, useRef } from 'react';
import {
  detectTargetContext,
  loadSavedPins,
  persistPins,
  loadDevModeActive,
  persistDevModeActive,
  formatPinsToPrompt,
} from './devFeedbackUtils';
import styles from './DevFeedbackOverlay.module.css';

export default function DevFeedbackOverlay({
  islandRef,
  islandState,
  activeTab,
  onTabChange,
  setIslandState,
  onActiveChange,
}) {
  const [pins, setPins] = useState(() => loadSavedPins());
  const [isDevMode, setIsDevMode] = useState(() => loadDevModeActive());
  const [showPins, setShowPins] = useState(true);
  const [draftPin, setDraftPin] = useState(null);
  const [editingPin, setEditingPin] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [hoveredPinId, setHoveredPinId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastText, setToastText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isDockDismissed, setIsDockDismissed] = useState(false);
  const [isDroppingPin, setIsDroppingPin] = useState(false);

  // Island exact pixel bounding rect in window
  const [islandRect, setIslandRect] = useState({ left: 0, top: 0, width: 0, height: 0 });

  const textareaRef = useRef(null);

  // Continuously track island DOM rectangle
  useEffect(() => {
    const el = islandRef?.current;
    if (!el) return;

    function updateRect() {
      if (!islandRef?.current) return;
      const r = islandRef.current.getBoundingClientRect();
      setIslandRect({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      });
    }

    updateRect();
    const ro = new ResizeObserver(updateRect);
    ro.observe(el);
    window.addEventListener('resize', updateRect);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateRect);
    };
  }, [islandRef, islandState]);

  // Notify parent and Electron main process whether modal/dev interaction is active
  const isInteracting = Boolean(draftPin || editingPin || isDrawerOpen || isDroppingPin);
  useEffect(() => {
    onActiveChange?.(isInteracting);
    window.electronAPI?.setModalOpen?.(isInteracting);
    return () => {
      window.electronAPI?.setModalOpen?.(false);
    };
  }, [isInteracting, onActiveChange]);

  // Focus textarea when a pin popover opens
  useEffect(() => {
    if (draftPin || editingPin) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [draftPin, editingPin]);

  // Keyboard shortcuts: Alt+D / Ctrl+Shift+D toggles dev mode; Esc closes popovers
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.altKey && (e.key === 'd' || e.key === 'D')) ||
          (e.ctrlKey && e.shiftKey && (e.key === 'd' || e.key === 'D'))) {
        e.preventDefault();
        setIsDevMode(prev => {
          const next = !prev;
          persistDevModeActive(next);
          setToastText(next ? 'Dev Feedback Mode Enabled' : 'Dev Feedback Mode Disabled');
          setTimeout(() => setToastText(''), 2000);
          return next;
        });
        return;
      }

      if (e.key === 'Escape') {
        if (isDroppingPin) {
          setIsDroppingPin(false);
          setToastText('Pin drop canceled');
          setTimeout(() => setToastText(''), 1500);
        } else if (draftPin || editingPin) {
          setDraftPin(null);
          setEditingPin(null);
          setCommentText('');
        } else if (isDrawerOpen) {
          setIsDrawerOpen(false);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [draftPin, editingPin, isDrawerOpen, isDroppingPin]);

  // Click listener for explicit "Drop Pin" mode
  useEffect(() => {
    if (!isDroppingPin) return;

    function handlePinDropClick(e) {
      // Ignore clicks inside our own popovers or dev dock
      if (e.target.closest(`.${styles.popoverCard}`) ||
          e.target.closest(`.${styles.devDock}`) ||
          e.target.closest(`.${styles.drawerCard}`)) {
        return;
      }

      const islandEl = islandRef?.current;
      if (!islandEl) return;

      const rect = islandEl.getBoundingClientRect();
      const padX = 14;
      const padY = 14;

      // Check if click was on or directly adjacent to island
      if (
        e.clientX < rect.left - padX ||
        e.clientX > rect.right + padX ||
        e.clientY < rect.top - 4 ||
        e.clientY > rect.bottom + padY
      ) {
        setIsDroppingPin(false);
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

      const context = detectTargetContext(e.target, islandState, activeTab);

      setIsDroppingPin(false);
      setEditingPin(null);
      setCommentText('');
      setDraftPin({
        xPercent,
        yPercent,
        targetLabel: context.targetLabel,
        category: context.category,
        domPath: context.domPath,
        viewState: islandState,
        activeTab: islandState === 'expanded' ? activeTab : null,
      });
    }

    window.addEventListener('click', handlePinDropClick, true);
    return () => window.removeEventListener('click', handlePinDropClick, true);
  }, [isDroppingPin, islandRef, islandState, activeTab]);

  // Right-click listener to capture click coordinates and drop pin
  useEffect(() => {
    function handleContextMenu(e) {
      if (!isDevMode) return;

      // Ignore right-clicks inside our own popovers or dev dock
      if (e.target.closest(`.${styles.popoverCard}`) ||
          e.target.closest(`.${styles.devDock}`) ||
          e.target.closest(`.${styles.drawerCard}`)) {
        return;
      }

      const islandEl = islandRef?.current;
      if (!islandEl) return;

      const rect = islandEl.getBoundingClientRect();
      const padX = 14;
      const padY = 14;

      // Ensure right-click happened within or directly on the island boundary
      if (
        e.clientX < rect.left - padX ||
        e.clientX > rect.right + padX ||
        e.clientY < rect.top - 4 ||
        e.clientY > rect.bottom + padY
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

      const context = detectTargetContext(e.target, islandState, activeTab);

      setIsDroppingPin(false);
      setEditingPin(null);
      setCommentText('');
      setDraftPin({
        xPercent,
        yPercent,
        targetLabel: context.targetLabel,
        category: context.category,
        domPath: context.domPath,
        viewState: islandState,
        activeTab: islandState === 'expanded' ? activeTab : null,
      });
    }

    // Capture phase listener so it takes precedence over normal interactions
    window.addEventListener('contextmenu', handleContextMenu, true);
    return () => window.removeEventListener('contextmenu', handleContextMenu, true);
  }, [isDevMode, islandRef, islandState, activeTab]);

  // Save new pin
  const handleSaveDraft = useCallback(() => {
    if (!draftPin || !commentText.trim()) return;

    setPins(prevPins => {
      const nextNumber = prevPins.length > 0
        ? Math.max(...prevPins.map(p => p.number || 0)) + 1
        : 1;

      const newPin = {
        id: `pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        number: nextNumber,
        xPercent: draftPin.xPercent,
        yPercent: draftPin.yPercent,
        targetLabel: draftPin.targetLabel,
        category: draftPin.category,
        domPath: draftPin.domPath,
        viewState: draftPin.viewState,
        activeTab: draftPin.activeTab,
        comment: commentText.trim(),
        createdAt: new Date().toISOString(),
      };

      const updated = [...prevPins, newPin];
      persistPins(updated);
      setToastText(`Pin #${nextNumber} added`);
      return updated;
    });

    setDraftPin(null);
    setCommentText('');
    setTimeout(() => setToastText(''), 1800);
  }, [draftPin, commentText]);

  // Update existing pin comment
  const handleUpdatePin = useCallback(() => {
    if (!editingPin || !commentText.trim()) return;

    setPins(prevPins => {
      const updated = prevPins.map(p =>
        p.id === editingPin.id ? { ...p, comment: commentText.trim() } : p
      );
      persistPins(updated);
      return updated;
    });

    setEditingPin(null);
    setCommentText('');
    setToastText(`Pin #${editingPin.number} updated`);
    setTimeout(() => setToastText(''), 1800);
  }, [editingPin, commentText]);

  // Delete a pin
  const handleDeletePin = useCallback((id) => {
    setPins(prevPins => {
      const updated = prevPins.filter(p => p.id !== id);
      persistPins(updated);
      return updated;
    });

    if (editingPin?.id === id) {
      setEditingPin(null);
      setCommentText('');
    }
    setToastText('Pin removed');
    setTimeout(() => setToastText(''), 1800);
  }, [editingPin]);

  // Clear all pins
  const handleClearAll = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all dev feedback pins?')) {
      setPins([]);
      persistPins([]);
      setDraftPin(null);
      setEditingPin(null);
      setIsDrawerOpen(false);
      setToastText('All pins cleared');
      setTimeout(() => setToastText(''), 1800);
    }
  }, []);

  // Copy all pins formatted as an AI prompt to clipboard
  const handleCopyPrompt = useCallback(async () => {
    if (pins.length === 0) {
      setToastText('No pins to copy! Right-click to drop a pin.');
      setTimeout(() => setToastText(''), 2200);
      return;
    }

    const promptText = formatPinsToPrompt(pins);
    try {
      await navigator.clipboard.writeText(promptText);
      setCopySuccess(true);
      setToastText(`Copied prompt (${pins.length} pins) to clipboard!`);
      setTimeout(() => {
        setCopySuccess(false);
        setToastText('');
      }, 2500);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      setToastText('Failed to copy to clipboard');
      setTimeout(() => setToastText(''), 2000);
    }
  }, [pins]);

  // Filter pins matching current view and tab
  const visiblePins = showPins && isDevMode ? pins.filter(p => {
    if (islandState === 'compact') return p.viewState === 'compact';
    if (islandState === 'expanded') {
      return p.viewState === 'expanded' && (!p.activeTab || p.activeTab === activeTab);
    }
    return p.viewState === islandState;
  }) : [];

  const nextDraftNumber = pins.length > 0
    ? Math.max(...pins.map(p => p.number || 0)) + 1
    : 1;

  // Smart popover position based on target pin
  const activePinForPopover = draftPin || editingPin;
  let popoverStyle = {};
  if (activePinForPopover && islandRect.width > 0) {
    const pinPxX = islandRect.left + (activePinForPopover.xPercent / 100) * islandRect.width;
    const pinPxY = islandRect.top + (activePinForPopover.yPercent / 100) * islandRect.height;
    const popWidth = 320;
    const popHeight = 175;
    const clampedX = Math.max(12, Math.min(window.innerWidth - popWidth - 12, pinPxX - popWidth / 2));
    let clampedY = pinPxY + 16;
    if (clampedY + popHeight > window.innerHeight - 12) {
      clampedY = Math.max(8, pinPxY - popHeight - 16);
    }
    popoverStyle = {
      position: 'absolute',
      left: `${clampedX}px`,
      top: `${clampedY}px`,
    };
  }

  // Floating dock position
  const dockStyle = {
    position: 'absolute',
    top: `${islandRect.top + islandRect.height + 6}px`,
    left: `${Math.max(12, islandRect.left + islandRect.width - 230)}px`,
  };

  return (
    <div className={styles.overlayContainer}>
      {/* ── Drop Pin Interactive Mode Indicator ───────────── */}
      {isDroppingPin && islandRect.width > 0 && (
        <div
          className={styles.droppingPinCanvas}
          style={{
            left: islandRect.left,
            top: islandRect.top,
            width: islandRect.width,
            height: islandRect.height,
            borderRadius:
              islandState === 'idle'
                ? '0 0 12px 12px'
                : islandState === 'compact'
                ? '0 0 20px 20px'
                : '0 0 26px 26px',
          }}
          title="Click anywhere on the island to drop a feedback pin"
        />
      )}

      {/* ── Rendered Visual Pins on Island Surface ──────────── */}
      {islandRect.width > 0 && (
        <div
          style={{
            position: 'absolute',
            left: islandRect.left,
            top: islandRect.top,
            width: islandRect.width,
            height: islandRect.height,
            pointerEvents: 'none',
          }}
        >
          {visiblePins.map((pin) => {
            const isHovered = hoveredPinId === pin.id;
            const isSelected = editingPin?.id === pin.id;

            return (
              <div
                key={pin.id}
                className={`${styles.pinMarker} ${isSelected ? styles.pinActive : ''}`}
                style={{
                  left: `${pin.xPercent}%`,
                  top: `${pin.yPercent}%`,
                }}
                onMouseEnter={() => setHoveredPinId(pin.id)}
                onMouseLeave={() => setHoveredPinId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setDraftPin(null);
                  setEditingPin(pin);
                  setCommentText(pin.comment);
                }}
                title={`Pin #${pin.number}: ${pin.targetLabel}`}
              >
                <div className={styles.pinHead}>
                  {pin.number}
                  {isSelected && <div className={styles.pulseRing} />}
                </div>
                <div className={styles.pinNeedle} />

                {/* Hover Tooltip Preview */}
                {isHovered && !editingPin && !draftPin && (
                  <div className={styles.pinTooltip}>
                    <span className={styles.pinTooltipHeader}>
                      #{pin.number} {pin.targetLabel}
                    </span>
                    <span className={styles.pinTooltipComment}>
                      {pin.comment}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Draft Pin Marker (while composing) ──────────────── */}
          {draftPin && (
            <div
              className={`${styles.pinMarker} ${styles.pinActive}`}
              style={{
                left: `${draftPin.xPercent}%`,
                top: `${draftPin.yPercent}%`,
              }}
            >
              <div className={styles.pinHead}>
                {nextDraftNumber}
                <div className={styles.pulseRing} />
              </div>
              <div className={styles.pinNeedle} />
            </div>
          )}
        </div>
      )}

      {/* ── New / Edit Pin Popover Modal ────────────────────── */}
      {(draftPin || editingPin) && (
        <div
          className={styles.popoverBackdrop}
          onClick={() => {
            setDraftPin(null);
            setEditingPin(null);
            setCommentText('');
          }}
        >
          <div
            className={styles.popoverCard}
            style={popoverStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.popoverHeader}>
              <div className={styles.badgeGroup}>
                <span className={styles.pinNumberBadge}>
                  #{draftPin ? nextDraftNumber : editingPin.number}
                </span>
                <span className={styles.targetChip} title={draftPin ? draftPin.targetLabel : editingPin.targetLabel}>
                  {draftPin ? draftPin.targetLabel : editingPin.targetLabel}
                </span>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => {
                  setDraftPin(null);
                  setEditingPin(null);
                  setCommentText('');
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <textarea
              ref={textareaRef}
              className={styles.commentTextarea}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
                  e.preventDefault();
                  if (draftPin) handleSaveDraft();
                  else handleUpdatePin();
                }
              }}
              placeholder="What should be changed, fixed, or improved here? (Press Enter to save)..."
              rows={3}
            />

            <div className={styles.popoverFooter}>
              <div className={styles.footerLeft}>
                {editingPin && (
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => handleDeletePin(editingPin.id)}
                  >
                    Delete Pin
                  </button>
                )}
              </div>
              <div className={styles.footerRight}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => {
                    setDraftPin(null);
                    setEditingPin(null);
                    setCommentText('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={draftPin ? handleSaveDraft : handleUpdatePin}
                  disabled={!commentText.trim()}
                >
                  {draftPin ? 'Save Pin' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Dev Dock / Toolbar ─────────────────────── */}
      {isDevMode && !isDockDismissed && islandRect.width > 0 && (
        <div
          className={styles.devDock}
          style={dockStyle}
        >
          <button
            type="button"
            className={styles.dockBadgeBtn}
            onClick={() => setIsDrawerOpen(true)}
            title={`View all ${pins.length} feedback pins (${visiblePins.length} on this view)`}
          >
            <span>Pins</span>
            <span className={styles.dockBadgePill}>{pins.length}</span>
          </button>

          <button
            type="button"
            className={`${styles.dockActionBtn} ${isDroppingPin ? styles.dockActionBtnActive : ''}`}
            onClick={() => {
              setIsDroppingPin(prev => !prev);
              setToastText(!isDroppingPin ? 'Click anywhere on the island to drop a pin' : '');
              if (!isDroppingPin) setTimeout(() => setToastText(''), 3000);
            }}
            title="Click to drop a new feedback pin on the island (or right-click anytime)"
          >
            {isDroppingPin ? '✕ Cancel' : '＋ Drop Pin'}
          </button>

          <button
            type="button"
            className={`${styles.dockActionBtn} ${copySuccess ? styles.dockActionBtnSuccess : ''}`}
            onClick={handleCopyPrompt}
            title="Copy all pins formatted as an AI prompt for coding"
          >
            {copySuccess ? '✓ Copied' : '📋 Copy Prompt'}
          </button>

          <button
            type="button"
            className={styles.dockIconBtn}
            onClick={() => setShowPins(prev => !prev)}
            title={showPins ? 'Hide visual pins on canvas' : 'Show visual pins on canvas'}
            aria-label="Toggle pin visibility"
          >
            {showPins ? '👁' : '🕶'}
          </button>

          <button
            type="button"
            className={styles.dockIconBtn}
            onClick={() => setIsDockDismissed(true)}
            title="Dismiss dev dock (press Alt+D to reopen)"
            aria-label="Dismiss dev dock"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Minimized Pin Indicator (When dock dismissed but pins exist) ── */}
      {isDevMode && isDockDismissed && pins.length > 0 && islandRect.width > 0 && (
        <button
          type="button"
          className={styles.dockMinimizedBtn}
          style={{
            position: 'absolute',
            top: `${islandRect.top + islandRect.height + 6}px`,
            left: `${Math.max(12, islandRect.left + islandRect.width - 55)}px`,
          }}
          onClick={() => setIsDockDismissed(false)}
          title="Reopen Dev Dock (Alt+D)"
        >
          📍 {pins.length}
        </button>
      )}

      {/* ── All Pins Drawer Modal ───────────────────────────── */}
      {isDrawerOpen && (
        <div
          className={styles.drawerOverlay}
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className={styles.drawerCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitle}>
                <span>📍 Feedback Pins</span>
                <span className={styles.dockBadgePill}>{pins.length}</span>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsDrawerOpen(false)}
              >
                ✕
              </button>
            </div>

            <button
              type="button"
              className={styles.drawerAddBtn}
              onClick={() => {
                setIsDrawerOpen(false);
                setIsDroppingPin(true);
                setToastText('Click anywhere on the island to drop a pin');
                setTimeout(() => setToastText(''), 3000);
              }}
            >
              ＋ Drop New Feedback Pin
            </button>

            <div className={styles.drawerList}>
              {pins.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
                  No pins recorded yet.<br />Right-click anywhere on the app to drop a pin.
                </div>
              ) : (
                pins.map((pin) => (
                  <div
                    key={pin.id}
                    className={styles.drawerItem}
                    onClick={() => {
                      // Jump to corresponding view & tab
                      if (pin.viewState === 'expanded') {
                        setIslandState?.('expanded');
                        if (pin.activeTab) onTabChange?.(pin.activeTab);
                      } else if (pin.viewState === 'compact') {
                        setIslandState?.('compact');
                      }
                      setEditingPin(pin);
                      setCommentText(pin.comment);
                      setIsDrawerOpen(false);
                    }}
                  >
                    <div className={styles.drawerItemTop}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className={styles.pinNumberBadge}>#{pin.number}</span>
                        <span className={styles.targetChip}>{pin.targetLabel}</span>
                      </div>
                      <button
                        type="button"
                        className={styles.closeBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePin(pin.id);
                        }}
                        title="Delete pin"
                      >
                        ✕
                      </button>
                    </div>
                    <div className={styles.drawerItemComment}>
                      {pin.comment}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>
                      {pin.viewState.toUpperCase()} {pin.activeTab ? `• ${pin.activeTab.toUpperCase()}` : ''} ({pin.xPercent.toFixed(0)}%, {pin.yPercent.toFixed(0)}%)
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className={styles.drawerFooter}>
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={handleClearAll}
                disabled={pins.length === 0}
              >
                Clear All
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleCopyPrompt}
                disabled={pins.length === 0}
              >
                📋 Copy All as Prompt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification Banner ───────────────────────── */}
      {toastText && (
        <div className={styles.toast}>
          <span>{toastText}</span>
        </div>
      )}
    </div>
  );
}
