import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeInput } from './timeInputParser.js';

describe('parseTimeInput', () => {
  it('parses standard mm:ss format', () => {
    assert.equal(parseTimeInput('25:00'), 25 * 60 * 1000);
    assert.equal(parseTimeInput('45:30'), 45.5 * 60 * 1000);
    assert.equal(parseTimeInput('01:15'), 75 * 1000);
    assert.equal(parseTimeInput('1:00'), 60 * 1000);
    assert.equal(parseTimeInput('90:00'), 90 * 60 * 1000);
  });

  it('rejects invalid seconds in mm:ss format', () => {
    assert.equal(parseTimeInput('25:60'), null);
    assert.equal(parseTimeInput('25:99'), null);
  });

  it('parses pure minute integers', () => {
    assert.equal(parseTimeInput('45'), 45 * 60 * 1000);
    assert.equal(parseTimeInput('5'), 5 * 60 * 1000);
    assert.equal(parseTimeInput('90'), 90 * 60 * 1000);
    assert.equal(parseTimeInput('1'), 60 * 1000);
    assert.equal(parseTimeInput('180'), 180 * 60 * 1000);
  });

  it('parses shorthand strings like 90m, 1h, 1h30m, 2h', () => {
    assert.equal(parseTimeInput('90m'), 90 * 60 * 1000);
    assert.equal(parseTimeInput('1h'), 60 * 60 * 1000);
    assert.equal(parseTimeInput('1h30m'), 90 * 60 * 1000);
    assert.equal(parseTimeInput('1h 30m'), 90 * 60 * 1000);
    assert.equal(parseTimeInput('2h'), 120 * 60 * 1000);
    assert.equal(parseTimeInput('1.5h'), 90 * 60 * 1000);
  });

  it('enforces min and max bounds', () => {
    assert.equal(parseTimeInput('0'), null); // Below min 1m
    assert.equal(parseTimeInput('0:30'), null); // Below min 1m
    assert.equal(parseTimeInput('181'), null); // Above max 180m
    assert.equal(parseTimeInput('200m'), null); // Above max 180m
    assert.equal(parseTimeInput('4h'), null); // Above max 180m
  });

  it('handles invalid inputs gracefully', () => {
    assert.equal(parseTimeInput('abc'), null);
    assert.equal(parseTimeInput(''), null);
    assert.equal(parseTimeInput('   '), null);
    assert.equal(parseTimeInput(null), null);
    assert.equal(parseTimeInput(undefined), null);
    assert.equal(parseTimeInput('-5'), null);
  });

  it('supports custom bounds options', () => {
    // Custom break limits: min 1m, max 60m
    assert.equal(parseTimeInput('5', { minMinutes: 1, maxMinutes: 60 }), 5 * 60 * 1000);
    assert.equal(parseTimeInput('75', { minMinutes: 1, maxMinutes: 60 }), null);
    assert.equal(parseTimeInput('30s', { minMinutes: 1, maxMinutes: 60 }), null);
  });
});
