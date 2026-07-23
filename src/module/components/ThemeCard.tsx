/** @format */

import React from 'react';
import { ITheme } from 'dddice-js';

import { getThemeDieTypes, isFullPolyhedralTheme } from '../helper/themeDice';

interface IRoomCardProps {
  theme: ITheme;
  onClick();
  key?: string;
  showCompletenessWarning?: boolean;
}

const ThemeCard = (props: IRoomCardProps) => {
  const { theme, onClick, showCompletenessWarning = true } = props;

  if (theme) {
    const isComplete = isFullPolyhedralTheme(theme);
    const availableTypes = [...getThemeDieTypes(theme)].sort().join(', ');

    return (
      <div
        key={theme.id}
        className="flex flex-col bg-no-repeat bg-contain bg-center rounded border-gray-300 border-solid border-2 bg-gray-800 p-2 pl-1 mb-2 cursor-pointer"
        style={{
          backgroundImage: `url(${theme.preview?.preview})`,
          backgroundColor: theme.label?.background_color,
        }}
        onClick={() => onClick()}
      >
        <div className="flex flex-row items-center gap-2">
          <div className="flex text-white rounded bg-gray-800 bg-opacity-50 px-1 text-lg font-bold">
            {theme.name}
          </div>
          {showCompletenessWarning && !isComplete && (
            <div
              className="flex text-warning rounded bg-gray-900 bg-opacity-70 px-1 text-xs font-semibold ml-auto"
              title={
                availableTypes
                  ? `Available dice: ${availableTypes}. Missing standard dice may fail Foundry rolls.`
                  : 'This theme is missing standard polyhedral dice.'
              }
            >
              Incomplete set
            </div>
          )}
        </div>
        {showCompletenessWarning && !isComplete && (
          <div className="mt-1 text-warning text-xs rounded bg-gray-900 bg-opacity-70 px-1 w-fit">
            May not support d20 / full polyhedral rolls
          </div>
        )}
      </div>
    );
  }
};

export default ThemeCard;
