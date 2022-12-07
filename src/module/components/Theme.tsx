/** @format */

import { useState } from 'react';

import { ITheme } from 'dddice-js';

import Share from '../assets/interface-essential-share-2.svg';

import ThemeCard from './ThemeCard';

interface IThemeProps {
  theme: ITheme;
  onSwitchTheme();
}

const Theme = (props: IThemeProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const { theme, onSwitchTheme } = props;
  if (theme) {
    return (
      <div className="text-white">
        <div className="mt-3 flex grid gap-4 grid-cols-3">
          <div></div>
          <div className="flex flex-row text-xl my-auto justify-center">Dice</div>
          {/*isCopied ? (
            <div className="text-neon-green text-xs ml-auto my-auto"> copied to clipboard</div>
          ) : (
            <span
              onClick={async () => {
                await navigator.clipboard.writeText(`${process.env.API_URI}/dice/${theme.id}`);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
              }}
              className="ml-auto"
            >
              <Share data-tip="copy share link" className="flex h-4 w-4" />
            </span>
          )*/}
        </div>
        <div data-tip="switch dice">
          <ThemeCard theme={theme} onClick={() => onSwitchTheme()} key={theme.id} />
        </div>
      </div>
    );
  }
};

export default Theme;
