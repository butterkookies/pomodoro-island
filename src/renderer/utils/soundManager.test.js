import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALARM_THEMES,
  getWellnessPrompt,
  getAlarmMomentType,
  playPhaseComplete,
  playCustomTimerComplete,
  playReminder,
  playUiClick,
  playSnapHaptic,
  playNotchSpring,
  previewSound,
} from './soundManager.js';

describe('soundManager — Calm Alarms & Moment-Aware Audio', () => {
  describe('ALARM_THEMES specification', () => {
    test('defines the 3 curated calm acoustic themes: zen, obsidian, marimba', () => {
      assert.ok(ALARM_THEMES.zen, 'Zen theme should exist');
      assert.ok(ALARM_THEMES.obsidian, 'Obsidian theme should exist');
      assert.ok(ALARM_THEMES.marimba, 'Marimba theme should exist');

      assert.equal(ALARM_THEMES.zen.label, 'Zen Bowl');
      assert.equal(ALARM_THEMES.obsidian.label, 'Obsidian');
      assert.equal(ALARM_THEMES.marimba.label, 'Marimba');
    });

    test('each theme has human-friendly names and acoustic descriptions', () => {
      for (const [key, theme] of Object.entries(ALARM_THEMES)) {
        assert.ok(typeof theme.name === 'string' && theme.name.length > 0, `${key} name missing`);
        assert.ok(typeof theme.desc === 'string' && theme.desc.length > 0, `${key} desc missing`);
      }
    });
  });

  describe('getAlarmMomentType — Moment Detection', () => {
    test('correctly classifies FOCUS as "break" (descending unwind cue)', () => {
      assert.equal(getAlarmMomentType('FOCUS'), 'break');
      assert.equal(getAlarmMomentType('focus'), 'break');
    });

    test('correctly classifies SHORT_BREAK and LONG_BREAK as "focus" (ascending awaken cue)', () => {
      assert.equal(getAlarmMomentType('SHORT_BREAK'), 'focus');
      assert.equal(getAlarmMomentType('LONG_BREAK'), 'focus');
      assert.equal(getAlarmMomentType('break'), 'focus');
    });

    test('defaults to "break" for undefined or fallback phase', () => {
      assert.equal(getAlarmMomentType(null), 'break');
      assert.equal(getAlarmMomentType(undefined), 'break');
    });
  });

  describe('Node.js Environment Safety (Headless / No AudioContext)', () => {
    test('methods execute gracefully without throwing in Node environment', () => {
      assert.doesNotThrow(() => {
        playPhaseComplete('FOCUS');
        playPhaseComplete('SHORT_BREAK');
        playCustomTimerComplete();
        playReminder();
        playUiClick();
        playSnapHaptic();
        playNotchSpring(true);
        previewSound('FOCUS', 'zen');
        previewSound('SHORT_BREAK', 'obsidian');
        previewSound('FOCUS', 'marimba');
      });
    });
  });

  describe('Wellness prompts', () => {
    test('returns a non-empty string for micro-break ergonomics', () => {
      const prompt = getWellnessPrompt();
      assert.ok(typeof prompt === 'string');
      assert.ok(prompt.length > 10);
    });
  });
});
