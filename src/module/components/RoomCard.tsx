/** @format */

import React from 'react';

import { IRoom } from 'dddice-js';
import classNames from 'classnames';

interface IRoomCardProps {
  room: IRoom;
  onClick();
  disabled?: boolean;
  key: string;
}

const RoomCard = (props: IRoomCardProps) => {
  const { room, onClick, disabled } = props;
  return (
    <div
      key={room.slug}
      className={classNames(
        'flex flex-col border bg-no-repeat bg-cover bg-center rounded border-gray-300 border-solid border-2 bg-gray-800 p-2 pl-1 mb-2',
        disabled ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer',
      )}
      style={{ backgroundImage: `url(${room.bg_file_path}` }}
      onClick={() => disabled || onClick()}
    >
      <div className="flex flex-row">
        <div className="flex text-white rounded bg-gray-800 bg-opacity-50 px-1 text-lg font-bold">
          {room.name}
        </div>
      </div>
      <div className="ml-6 mt-1 flex flex-row-reverse flex-wrap">
        {room.participants &&
          room.participants.map(participant => (
            <span
              className={classNames(
                'relative transform hover:scale-105 transition-all duration-200 mr-1 mb-1',
                disabled && 'pointer-events-none',
              )}
              key={participant.id}
              data-tip={participant.username}
            >
              <span
                data-tip={participant.username}
                className="text-white relative z-10 hover:z-20 rounded-full border-2 border-solid flex items-center justify-center font-bold bg-gray-800 cursor-pointer w-8 h-8 lg:w-10 lg:h-10 text-xs lg:text-md"
                currentitem="false"
                style={{
                  borderColor: participant.color,
                }}
              >
                {participant.username[0]}
              </span>
            </span>
          ))}
      </div>
    </div>
  );
};

export default RoomCard;
