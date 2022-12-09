/**
 * List Rooms
 *
 * @format
 */

import React from 'react';
import { IRoom } from 'dddice-js';

import Refresh from '../assets/arrows-diagrams-arrow-rotate-1.svg';

import DddiceButton from './DddiceButton';
import RoomCard from './RoomCard';

interface IRooms {
  rooms: IRoom[];
  onSelectRoom(room: IRoom): void;
  onJoinRoom(room: string, passcode?: string): void;
  onError(message: string): void;
  onConnectAccount(): void;
  onCreateRoom(): void;
  onRefreshRooms(): void;
}

const RoomSelection = (props: IRooms) => {
  const {
    rooms,
    onSelectRoom,
    onJoinRoom,
    onError,
    onConnectAccount,
    onCreateRoom,
    onRefreshRooms,
  } = props;

  const onChangeLink = event => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const link = formData.get('link') as string;
    const passcode = new URLSearchParams(link.split('?')[1]).get('passcode');
    const match = link.match(/\/room\/([a-zA-Z0-9]{7,14})/);
    if (match) {
      onJoinRoom(match[1], passcode);
    } else {
      onError('Invalid room link.');
    }
  };

  /**
   * Render
   */
  return (
    <div className="text-white flex flex-col">
      <div className="mt-3 flex">
        <div className="flex mr-auto">{''}</div>
        <div className="flex flex-row text-xl my-auto justify-center">Join A Room</div>
        <span onClick={onRefreshRooms} className="ml-auto">
          <Refresh data-tip="reload room list" className="flex h-4 w-4" />
        </span>
      </div>
      <form onSubmit={onChangeLink}>
        <label className="text-gray-300 m-2 flex flex-row justify-center">
          <div className="mr-2">Join Via Link</div>
          <input name="link" className="bg-gray-800 rounded text-gray-100" />
        </label>
      </form>
      <div className="flex flex-row items-center text-gray-300">
        <div className="flex-grow border-solid border-0 border-t border-gray-700" />
        <div className="pt-0 p-1">or</div>
        <div className="flex-grow border-solid border-0 border-t border-gray-700" />
      </div>
      <div className="text-gray-300 m-auto">
        Don't see your rooms?{' '}
        <DddiceButton size="small" onClick={onConnectAccount} isSecondary>
          connect your account
        </DddiceButton>
      </div>
      {rooms?.length > 0 ? (
        <div className="overflow-y-auto mt-2">
          {rooms.map((room: IRoom) => (
            <RoomCard room={room} onClick={() => onSelectRoom(room)} key={room.slug} />
          ))}
        </div>
      ) : (
        <DddiceButton onClick={onCreateRoom}>Create A Room</DddiceButton>
      )}
    </div>
  );
};

export default RoomSelection;
