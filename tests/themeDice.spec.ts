/** @format */

import { describe, expect, it } from '@jest/globals';
import { ITheme } from 'dddice-js';

import {
  formatMissingDieTypesError,
  getMissingDieTypesForRoll,
  getThemeDieTypes,
  isFullPolyhedralTheme,
} from '../src/module/helper/themeDice';

const themeWith = (available_dice: ITheme['available_dice'], name = 'Test Theme'): ITheme =>
  ({
    id: 'theme-1',
    name,
    available_dice,
  }) as ITheme;

describe('themeDice helpers', () => {
  it('reads string and object available_dice entries', () => {
    const theme = themeWith(['d6', { type: 'd20' } as any]);
    expect([...getThemeDieTypes(theme)].sort()).toEqual(['d20', 'd6']);
  });

  it('treats notation/id as die types when type is a mesh alias (e.g. d10x)', () => {
    const theme = themeWith([
      { id: 'd4', type: 'd4', notation: 'd4' },
      { id: 'd6', type: 'd6', notation: 'd6' },
      { id: 'd8', type: 'd8', notation: 'd8' },
      { id: 'd10', type: 'd10', notation: 'd10' },
      { id: 'd10x', type: 'd10', notation: 'd10x' },
      { id: 'd12', type: 'd12', notation: 'd12' },
      { id: '8a740633-a462-4e56-b8d5-0b6f813823e9', type: 'd20', notation: 'd20' },
    ] as any);

    expect([...getThemeDieTypes(theme)].sort()).toEqual([
      'd10',
      'd10x',
      'd12',
      'd20',
      'd4',
      'd6',
      'd8',
    ]);
    expect(isFullPolyhedralTheme(theme)).toBe(true);
    expect(getMissingDieTypesForRoll(theme, [{ type: 'd10x' }, { type: 'd20' }])).toEqual([]);
  });

  it('ignores UUID-only ids that are not die type labels', () => {
    const theme = themeWith([
      { id: '8a740633-a462-4e56-b8d5-0b6f813823e9', type: 'd20', notation: 'd20' },
    ] as any);
    expect([...getThemeDieTypes(theme)].sort()).toEqual(['d20']);
  });

  it('detects full polyhedral themes', () => {
    expect(
      isFullPolyhedralTheme(themeWith(['d4', 'd6', 'd8', 'd10', 'd10x', 'd20', 'd12'])),
    ).toBe(true);
    expect(isFullPolyhedralTheme(themeWith(['d6', 'd20']))).toBe(false);
  });

  it('finds missing die types for a roll', () => {
    const theme = themeWith(['d6', 'd8']);
    expect(
      getMissingDieTypesForRoll(theme, [
        { type: 'd20' },
        { type: 'd6' },
        { type: 'mod' },
        { type: 'd20' },
      ]),
    ).toEqual(['d20']);
  });

  it('skips validation when available_dice is missing from cached theme', () => {
    const theme = themeWith(undefined as any);
    expect(getMissingDieTypesForRoll(theme, [{ type: 'd20' }])).toEqual([]);
  });

  it('allows d20 rolls against a full polyhedral theme', () => {
    const theme = themeWith(['d4', 'd6', 'd8', 'd10', 'd10x', 'd20', 'd12']);
    expect(getMissingDieTypesForRoll(theme, [{ type: 'd20' }, { type: 'd6' }])).toEqual([]);
  });

  it('formats a clear error for missing die types', () => {
    const theme = themeWith(['d6'], 'Marble d6s');
    expect(formatMissingDieTypesError(theme, ['d20'])).toBe(
      'd20 not available in "Marble d6s". Switch to a theme that includes d20 in dddice settings.',
    );
  });
});
