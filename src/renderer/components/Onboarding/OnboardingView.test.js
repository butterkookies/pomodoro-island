import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsxPath = path.resolve(__dirname, 'OnboardingView.jsx');
const rawCode = fs.readFileSync(jsxPath, 'utf8');

// Mock styles and soundManager for Node environment
const mockStyles = `
const styles = new Proxy({}, {
  get: (target, prop) => prop,
});
`;

const transformed = esbuild.transformSync(rawCode, {
  loader: 'jsx',
  format: 'esm',
  jsx: 'automatic',
});

let codeWithMock = transformed.code.replace(
  /import styles from ['"][^'"]+['"];/,
  mockStyles
);

codeWithMock = codeWithMock.replace(
  /import \{ playUiClick, playSnapHaptic \} from ['"][^'"]+['"];/,
  'const playUiClick = () => {}; const playSnapHaptic = () => {};'
);

const tmpJsPath = path.resolve(__dirname, '.tmp.onboarding.js');
fs.writeFileSync(tmpJsPath, codeWithMock, 'utf8');

let mod;
try {
  mod = await import('./.tmp.onboarding.js');
} finally {
  try {
    fs.unlinkSync(tmpJsPath);
  } catch (e) {}
}

const { default: OnboardingView } = mod;

describe('OnboardingView Component', () => {
  it('renders initial step (Welcome to Pomodoro Island) with stepper and skip button', () => {
    const html = renderToStaticMarkup(
      React.createElement(OnboardingView, {
        onComplete: () => {},
        onStartFirstSession: () => {},
        onSkip: () => {},
      })
    );

    assert.ok(html.includes('Welcome to Pomodoro Island'), 'Should display headline');
    assert.ok(html.includes('1 of 3'), 'Should indicate step 1 of 3');
    assert.ok(html.includes('Skip'), 'Should render Skip button');
    assert.ok(html.includes('Continue'), 'Should render Continue button on step 1');
    assert.ok(html.includes('1. Idle'), 'Should render simulator tabs');
    assert.ok(html.includes('2. Compact'), 'Should render simulator tabs');
    assert.ok(html.includes('3. Expanded'), 'Should render simulator tabs');
  });

  it('renders correctly without throwing when callbacks are omitted', () => {
    assert.doesNotThrow(() => {
      renderToStaticMarkup(React.createElement(OnboardingView));
    });
  });
});
