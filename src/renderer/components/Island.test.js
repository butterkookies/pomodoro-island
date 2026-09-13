import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const islandJsxPath = path.resolve(__dirname, 'Island.jsx');
const islandCssPath = path.resolve(__dirname, 'Island.module.css');
const islandJsx = fs.readFileSync(islandJsxPath, 'utf8');
const islandCss = fs.readFileSync(islandCssPath, 'utf8');

describe('Island Component — Ear Permanence & Full Cloth Continuity', () => {
  it('renders left and right ears as permanent SVG elements without layout projection bugs', () => {
    assert.ok(islandJsx.includes('className={styles.notchEarLeft}'), 'left ear must be present with notchEarLeft class');
    assert.ok(islandJsx.includes('className={styles.notchEarRight}'), 'right ear must be present with notchEarRight class');
    assert.ok(/<svg\s+className=\{styles\.notchEarLeft\}/.test(islandJsx), 'left ear must be a stable svg');
    assert.ok(/<svg\s+className=\{styles\.notchEarRight\}/.test(islandJsx), 'right ear must be a stable svg');
    assert.ok(!islandJsx.includes('<motion.svg'), 'ears must not use motion.svg');
  });

  it('ears have width 15 and height 14 with canonical tangent bezier curves', () => {
    assert.ok(islandJsx.includes('viewBox="0 0 15 14"'), 'ears must have 15x14 viewBox');
    assert.ok(islandJsx.includes('d="M 0 0 C 7 0 14 7 14 14 L 15 14 L 15 0 Z"'), 'left ear must have tangent concave curve');
    assert.ok(islandJsx.includes('d="M 15 0 C 8 0 1 7 1 14 L 0 14 L 0 0 Z"'), 'right ear must have tangent concave curve');
  });

  it('ear fill matches island background material identically (no color or opacity seams)', () => {
    assert.ok(islandJsx.includes('fill="var(--island-bg, #000000)"'), 'ear fill must use var(--island-bg)');
    assert.ok(islandCss.includes('fill: var(--island-bg, #000000);'), 'earFill in CSS must use var(--island-bg)');
  });

  it('anchors left ear to left edge and right ear to 100% left in CSS (no right-offset bugs)', () => {
    assert.ok(islandCss.includes('.notchEarLeft {'), 'must define .notchEarLeft');
    assert.ok(islandCss.includes('transform: translateX(-100%);'), 'left ear must be translated -100%');
    assert.ok(islandCss.includes('.notchEarRight {'), 'must define .notchEarRight');
    assert.ok(islandCss.includes('left: 100%;'), 'right ear must anchor to left: 100%');
    assert.ok(islandCss.includes('transform: translateX(-1px);'), 'right ear must overlap by 1px to prevent subpixel gaps');
  });

  it('renders seamless islandBorderFrame starting at ear height (14px) with no vertical cut seam', () => {
    assert.ok(islandJsx.includes('className={styles.islandBorderFrame}'), 'must render islandBorderFrame');
    assert.ok(islandCss.includes('.islandBorderFrame {'), 'must style .islandBorderFrame');
    assert.ok(islandCss.includes('top: 14px;'), 'islandBorderFrame must start at top: 14px');
    assert.ok(islandCss.includes('border-top: none;'), 'islandBorderFrame must have no top border');
  });

  it('keeps island pinned flush to bezel during drag (no scaleY squish or detach)', () => {
    assert.ok(!islandJsx.includes('scaleY: isDragging ? 0.985 : 1'), 'must NOT squish scaleY on drag');
    assert.ok(islandJsx.includes("transformOrigin: 'top center'"), 'must anchor transformOrigin to top center');
  });

  it('anchors magnetic alignment tick to bottom edge (zero top bezel line)', () => {
    assert.ok(islandCss.includes('.magneticGuideTick {'), 'must define magneticGuideTick');
    assert.ok(islandCss.includes('bottom: 0;'), 'magneticGuideTick must anchor to bottom: 0');
    assert.ok(!islandCss.includes('top: 0;\n  left: 50%;\n  transform: translateX(-50%);\n  width: 24px;'), 'must not anchor tick at top: 0');
  });
});
