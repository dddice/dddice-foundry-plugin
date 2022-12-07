/** @format */

import DddiceButton from './DddiceButton';

const Splash = props => {
  const { onJoinRoom, onConnectAccount, onCreateRoom } = props;
  return (
    <div className="flex flex-col">
      <div className="flex flex-row">
        <DddiceButton onClick={onJoinRoom}>Join Room</DddiceButton>
        <DddiceButton isSecondary onClick={onCreateRoom}>
          {' '}
          Create Room
        </DddiceButton>
      </div>
      <div className="flex justify-center">
        <DddiceButton size="small" isSecondary onClick={onConnectAccount}>
          Connect Your Account
        </DddiceButton>
      </div>
    </div>
  );
};

export default Splash;
