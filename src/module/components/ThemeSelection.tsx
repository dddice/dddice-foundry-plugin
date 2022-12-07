/**
 * List Rooms
 *
 * @format
 */

import React from 'react';
import { ITheme } from 'dddice-js';

import Refresh from '../assets/arrows-diagrams-arrow-rotate-1.svg';

import DddiceButton from './DddiceButton';
import ThemeCard from './ThemeCard';

interface IThemes {
  themes: ITheme[];
  onSelectTheme(room: ITheme): void;
  onConnectAccount(): void;
  onRefreshThemes(): void;
}

const ThemeSelection = (props: IThemes) => {
  const { themes, onSelectTheme, onConnectAccount, onRefreshThemes } = props;

  /**
   * Render
   */
  return (
    <div className="text-white flex flex-col">
      <div className="mt-3 flex">
        <div className="flex mr-auto">{''}</div>
        <div className="flex flex-row text-xl my-auto justify-center">Choose Your Dice</div>
        <span onClick={onRefreshThemes} className="ml-auto">
          <Refresh data-tip="refresh dice box" className="flex h-4 w-4" />
        </span>
      </div>
      {themes?.length > 0 && (
        <div className="overflow-y-auto scroll">
          {themes.map((theme: ITheme) => (
            <ThemeCard theme={theme} onClick={() => onSelectTheme(theme)} key={theme.id} />
          ))}
        </div>
      )}
      <div className="text-gray-300">
        Don't see your dice?{' '}
        <DddiceButton size="small" onClick={onConnectAccount} isSecondary>
          connect your account
        </DddiceButton>
      </div>
    </div>
  );
};

export default ThemeSelection;
