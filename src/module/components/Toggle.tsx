/** @format */

import React, { useState, useCallback } from 'react';
import classNames from 'classnames';

export default ({ onChange, value = false }) => {
  const [isEnabled, setIsEnabled] = useState(value);

  const onClick = useCallback(() => {
    onChange(!isEnabled);
    setIsEnabled(isEnabled => (isEnabled === undefined ? false : !isEnabled));
  }, [isEnabled]);

  return (
    <div
      className={classNames(
        'rounded-full relative h-8 w-16 group transition-colors cursor-pointer',
        isEnabled ? 'bg-neon-pink' : 'bg-gray-700',
      )}
      onClick={onClick}
    >
      <span
        className={classNames(
          'h-8 w-8 inline-block rounded-full absolute top-0 transition-all left-0',
          isEnabled
            ? 'ml-16 transform -translate-x-full bg-white group-hover:bg-gray-100'
            : 'bg-gray-300 group-hover:bg-gray-200',
        )}
      />
    </div>
  );
};
