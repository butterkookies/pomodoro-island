import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeInput, formatDurationLabel } from './timeInputParser.js';

describe('parseTimeInput', () => {
  it('parses standard mm:ss format and handles spaces around colon', () => {
    assert.equal(parseTimeInput('25:00'), 25 * 60 * 1000);
    assert.equal(parseTimeInput('25 : 00'), 25 * 60 * 1000);
    assert.equal(parseTimeInput('25: 00'), 25 * 60 * 1000);
    assert.equal(parseTimeInput('25 :00'), 25 * 60 * 1000);
    assert.equal(parseTimeInput('45:30'), 45.5 * 60 * 1000);
    assert.equal(parseTimeInput('45 : 30'), 45.5 * 60 * 1000);
    assert.equal(parseTimeInput('01:15'), 75 * 1000);
    assert.equal(parseTimeInput('1:00'), 60 * 1000);
    assert.equal(parseTimeInput('90:00'), 90 * 60 * 1000);
  });

  it('parses hh:mm:ss format with hours, minutes, and seconds', () => {
    assert.equal(parseTimeInput('1:30:00'), 90 * 60 * 1000);
    assert.equal(parseTimeInput('01:15:30'), (75 * 60 + 30) * 1000);
    assert.equal(parseTimeInput('2:00:00'), 2 * 3600 * 1000);
    assert.equal(parseTimeInput('1:60:00'), null); // invalid minutes
    assert.equal(parseTimeInput('1:30:60'), null); // invalid seconds
  });

  it('parses pure seconds and seconds shorthand (:ss, 30s, 45sec)', () => {
    assert.equal(parseTimeInput('30s'), 30 * 1000);
    assert.equal(parseTimeInput('45sec'), 45 * 1000);
    assert.equal(parseTimeInput('10secs'), 10 * 1000);
    assert.equal(parseTimeInput('15 seconds'), 15 * 1000);
    assert.equal(parseTimeInput('90s'), 90 * 1000);
    assert.equal(parseTimeInput(':30'), 30 * 1000);
    assert.equal(parseTimeInput(':45'), 45 * 1000);
    assert.equal(parseTimeInput('0:30'), 30 * 1000);
    assert.equal(parseTimeInput(':60'), null); // invalid seconds
  });

  it('parses mixed combinations of hours, minutes, and seconds', () => {
    assert.equal(parseTimeInput('1m 30s'), 90 * 1000);
    assert.equal(parseTimeInput('1m30s'), 90 * 1000);
    assert.equal(parseTimeInput('2min 45sec'), (2 * 60 + 45) * 1000);
    assert.equal(parseTimeInput('1h 15m 30s'), (3600 + 15 * 60 + 30) * 1000);
    assert.equal(parseTimeInput('1hr 30min 45sec'), (3600 + 30 * 60 + 45) * 1000);
    assert.equal(parseTimeInput('2h 30s'), (2 * 3600 + 30) * 1000);
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

  it('parses shorthand and colloquial strings like 90m, 1h, 1h30m, 2h, min, mins, hr, hrs', () => {
    assert.equal(parseTimeInput('90m'), 90 * 60 * 1000);
    assert.equal(parseTimeInput('90min'), 90 * 60 * 1000);
    assert.equal(parseTimeInput('90mins'), 90 * 60 * 1000);
    assert.equal(parseTimeInput('90 min'), 90 * 60 * 1000);
    assert.equal(parseTimeInput('90 mins'), 90 * 60 * 1000);
    assert.equal(parseTimeInput('1h'), 60 * 60 * 1000);
    assert.equal(parseTimeInput('1hr'), 60 * 60 * 1000);
    assert.equal(parseTimeInput('1hrs'), 60 * 60 * 1000);
    assert.equal(parseTimeInput('1 hr'), 60 * 60 * 1000);
    assert.equal(parseTimeInput('1 hrs'), 60 * 60 * 1000);
    assert.equal(parseTimeInput('1h30m'), 90 * 60 * 1000);
    assert.equal(parseTimeInput('1h 30m'), 90 * 60 * 1000);
    assert.equal(parseTimeInput('1hr 30min'), 90 * 60 * 1000);
    assert.equal(parseTimeInput('1 hr 30 mins'), 90 * 60 * 1000);
    assert.equal(parseTimeInput('2h'), 120 * 60 * 1000);
    assert.equal(parseTimeInput('2 hrs'), 120 * 60 * 1000);
    assert.equal(parseTimeInput('1.5h'), 90 * 60 * 1000);
    assert.equal(parseTimeInput('1.5 hrs'), 90 * 60 * 1000);
  });

  it('enforces min and max bounds', () => {
    assert.equal(parseTimeInput('0'), null); // Below default min 1s
    assert.equal(parseTimeInput('0s'), null); // 0s is below 1s
    assert.equal(parseTimeInput('13h'), null); // Above default max 12h
    assert.equal(parseTimeInput('800m'), null); // Above default max 12h (720m)
  });

  it('handles invalid inputs gracefully', () => {
    assert.equal(parseTimeInput('abc'), null);
    assert.equal(parseTimeInput(''), null);
    assert.equal(parseTimeInput('   '), null);
    assert.equal(parseTimeInput(null), null);
    assert.equal(parseTimeInput(undefined), null);
    assert.equal(parseTimeInput('-5'), null);
    assert.equal(parseTimeInput('1h 30m invalid'), null);
  });

  it('supports custom bounds options', () => {
    // Custom break limits: min 1m, max 60m
    assert.equal(parseTimeInput('5', { minMinutes: 1, maxMinutes: 60 }), 5 * 60 * 1000);
    assert.equal(parseTimeInput('75', { minMinutes: 1, maxMinutes: 60 }), null);
    assert.equal(parseTimeInput('30s', { minMinutes: 1, maxMinutes: 60 }), null);
    assert.equal(parseTimeInput('30s', { minSeconds: 10 }), 30 * 1000);
    assert.equal(parseTimeInput('5s', { minSeconds: 10 }), null);
  });
});

describe('formatDurationLabel', () => {
  it('formats pure seconds, pure minutes, pure hours, and mixed durations', () => {
    assert.equal(formatDurationLabel(45 * 1000), '45s');
    assert.equal(formatDurationLabel(25 * 60 * 1000), '25m');
    assert.equal(formatDurationLabel(60 * 60 * 1000), '1h');
    assert.equal(formatDurationLabel(90 * 60 * 1000), '1h 30m');
    assert.equal(formatDurationLabel((90 + 15) * 1000), '1m 45s');
    assert.equal(formatDurationLabel((3600 + 15 * 60 + 30) * 1000), '1h 15m 30s');
    assert.equal(formatDurationLabel(0), '0s');
    assert.equal(formatDurationLabel(-1000), '0s');
  });
});

