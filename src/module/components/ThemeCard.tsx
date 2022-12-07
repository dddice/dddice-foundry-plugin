/** @format */

import React from 'react';
import { ITheme } from 'dddice-js';

interface IRoomCardProps {
  theme: ITheme;
  onClick();
  key?: string;
}

const ThemeCard = (props: IRoomCardProps) => {
  const { theme, onClick } = props;

  if (theme) {
    return (
      <div
        key={theme.id}
        className="flex flex-col border bg-no-repeat bg-contain bg-center rounded border-gray-300 border-solid border-2 bg-gray-800 p-2 pl-1 mb-2 cursor-pointer"
        style={{
          backgroundImage: `url(${theme.preview?.preview}`,
          backgroundColor: theme.label?.background_color,
        }}
        onClick={() => onClick()}
      >
        <div className="flex flex-row">
          <div className="flex text-white rounded bg-gray-800 bg-opacity-50 px-1 text-lg font-bold">
            {theme.name}
          </div>
        </div>
      </div>
    );
  }
};

export default ThemeCard;
