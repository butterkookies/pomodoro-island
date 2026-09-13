import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import esbuild from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsxPath = path.resolve(__dirname, 'CompactView.jsx');
const rawCode = fs.readFileSync(jsxPath, 'utf8');

const mockStyles = `
const styles = {
  compact: 'compact',
  leftButtonGroup: 'leftButtonGroup',
  rightButtonGroup: 'rightButtonGroup',
  tactileBtn: 'tactileBtn',
  tactileBtnActive: 'tactileBtnActive',
  centerCluster: 'centerCluster',
  timeWrapper: 'timeWrapper',
  timeDigits: 'timeDigits',
  timeColon: 'timeColon',
  progressTrack: 'progressTrack',
  progressFill: 'progressFill',
  taskGlancePill: 'taskGlancePill',
  taskGlanceIcon: 'taskGlanceIcon',
  taskGlanceText: 'taskGlanceText',
  musicGlancePill: 'musicGlancePill',
  musicThumb: 'musicThumb',
  equalizerWave: 'equalizerWave',
  eqBar: 'eqBar',
  musicGlanceText: 'musicGlanceText',
  holdProgressRing: 'holdProgressRing',
  reminderBadge: 'reminderBadge',
  reminderDot: 'reminderDot',
};
`;

const transformed = esbuild.transformSync(rawCode, {
  loader: 'jsx',
  format: 'esm',
  jsx: 'automatic',
});

// Replace CSS module import and framer-motion import for node testing
let codeWithMock = transformed.code.replace(
  /import styles from ['"][^'"]+['"];/,
  mockStyles
);
codeWithMock = codeWithMock.replace(
  /import\s*\{[^}]*\}\s*from\s*['"]framer-motion['"];/,
  `
  const motion = {
    div: (props) => React.createElement('div', props),
    section: (props) => React.createElement('section', props),
  };
  `
);

const tmpJsPath = path.resolve(__dirname, 'tmp.CompactView.test.mjs');
fs.writeFileSync(tmpJsPath, codeWithMock);

let CompactView;
try {
  const mod = await import(pathToFileURL(tmpJsPath).href);
  CompactView = mod.default;
} finally {
  if (fs.existsSync(tmpJsPath)) {
    fs.unlinkSync(tmpJsPath);
  }
}

describe('CompactView Component & Layout Sizing', () => {
  it('renders default compact view with Play button, time digits, progress bar, and Skip button', () => {
    const html = renderToStaticMarkup(
      React.createElement(CompactView, {
        timeDisplay: '25:00',
        percent: 1,
        isRunning: false,
      })
    );

    assert.match(html, /class="compact"/);
    assert.match(html, /class="leftButtonGroup"/);
    assert.match(html, /class="rightButtonGroup"/);
    assert.match(html, /class="centerCluster"/);
    assert.match(html, /class="timeDigits">25<\/span>/);
    assert.match(html, /class="timeDigits">00<\/span>/);
    assert.match(html, /class="progressTrack"/);
    assert.match(html, /aria-label="Play"/);
    assert.match(html, /aria-label="Skip phase \(hold to reset\)"/);
  });

  it('renders Pause button when isRunning is true', () => {
    const html = renderToStaticMarkup(
      React.createElement(CompactView, {
        timeDisplay: '18:42',
        percent: 0.75,
        isRunning: true,
      })
    );

    assert.match(html, /aria-label="Pause"/);
    assert.match(html, /class="timeDigits">18<\/span>/);
    assert.match(html, /class="timeDigits">42<\/span>/);
  });

  it('renders active focus task glance pill when activeTask is set', () => {
    const html = renderToStaticMarkup(
      React.createElement(CompactView, {
        timeDisplay: '25:00',
        percent: 1,
        isRunning: true,
        activeTask: 'Test',
      })
    );

    assert.match(html, /class="taskGlancePill"/);
    assert.match(html, /class="taskGlanceText">Test<\/span>/);
    assert.match(html, /title="Focus Goal: Test"/);
  });

  it('renders active now playing music glance pill when nowPlaying is playing with a title', () => {
    const html = renderToStaticMarkup(
      React.createElement(CompactView, {
        timeDisplay: '25:00',
        percent: 1,
        isRunning: true,
        nowPlaying: {
          isPlaying: true,
          title: 'Watch Chad Powers...',
          artist: '',
        },
      })
    );

    assert.match(html, /class="musicGlancePill"/);
    assert.match(html, /class="musicGlanceText">Watch Chad Powers\.\.\.<\/span>/);
    assert.match(html, /class="equalizerWave"/);
  });

  it('renders both focus task and now playing pills simultaneously without crashing', () => {
    const html = renderToStaticMarkup(
      React.createElement(CompactView, {
        timeDisplay: '25:00',
        percent: 1,
        isRunning: false,
        activeTask: 'Test',
        nowPlaying: {
          isPlaying: true,
          title: 'Watch Chad Powers...',
          artist: '',
        },
      })
    );

    assert.match(html, /class="taskGlancePill"/);
    assert.match(html, /class="taskGlanceText">Test<\/span>/);
    assert.match(html, /class="musicGlancePill"/);
    assert.match(html, /class="musicGlanceText">Watch Chad Powers\.\.\.<\/span>/);
    assert.match(html, /class="leftButtonGroup"/);
    assert.match(html, /class="rightButtonGroup"/);
  });

  it('renders optional reminder badge when earliest reminder is upcoming within 60m', () => {
    const fireAt = Date.now() + 15 * 60000;
    const html = renderToStaticMarkup(
      React.createElement(CompactView, {
        timeDisplay: '25:00',
        percent: 1,
        isRunning: false,
        nextReminder: {
          name: 'Stretch',
          fireAt,
        },
      })
    );

    assert.match(html, /class="reminderBadge"/);
    assert.match(html, /Stretch in 15m/);
  });
});
