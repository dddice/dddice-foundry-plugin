/** @format */

import '../module.css';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactTooltip from 'react-tooltip';
import { IRoom, ITheme, ThreeDDiceAPI } from 'dddice-js';

import Back from './assets/interface-essential-left-arrow.svg';
import Loading from './assets/loading.svg';
import LogOut from './assets/interface-essential-exit-door-log-out-1.svg';
import Help from './assets/support-help-question-question-square.svg';
import imageLogo from 'url:./assets/dddice-48x48.png';

import ApiKeyEntry from './components/ApiKeyEntry';
import RoomSelection from './components/RoomSelection';

import Room from './components/Room';
import ThemeSelection from './components/ThemeSelection';
import Theme from './components/Theme';

import createLogger from './log';
const log = createLogger('App');

export interface IStorage {
  apiKey?: string;
  room?: IRoom;
  theme?: ITheme;
  themes?: ITheme[];
  rooms?: IRoom[];
}

export const DefaultStorage: IStorage = {
  apiKey: undefined,
  room: undefined,
  theme: undefined,
  themes: undefined,
  rooms: undefined,
};

const DddiceSettings = props => {
  const { storageProvider, sdkBridge } = props;

  /**
   * API
   */
  const api = useRef(ThreeDDiceAPI);

  /**
   * Storage Object
   */
  const [state, setState] = useState(DefaultStorage);

  /**
   * Loading
   */
  const [isLoading, setIsLoading] = useState(0);

  const pushLoading = () => setIsLoading(isLoading => isLoading + 1);
  const popLoading = () => setIsLoading(isLoading => Math.max(isLoading - 1, 0));
  const clearLoading = () => setIsLoading(0);

  /**
   * Loading
   */
  const [loadingMessage, setLoadingMessage] = useState('');

  /**
   * Connected
   */
  const [isConnected, setIsConnected] = useState(false);

  /**
   * Error
   */
  const [error, setError] = useState();

  /**
   * Current VTT
   */
  const [vtt, setVTT] = useState(undefined);

  const [isEnterApiKey, setIsEnterApiKey] = useState(false);

  /**
   * Connect to VTT
   */
  useEffect(() => {
    setVTT('Foundry VTT');
    setIsConnected(true);
  }, []);

  useEffect(() => {
    async function initStorage() {
      const [apiKey, room, theme, rooms, themes] = await Promise.all([
        storageProvider.getStorage('apiKey'),
        storageProvider.getStorage('room'),
        storageProvider.getStorage('theme'),
        storageProvider.getStorage('rooms'),
        storageProvider.getStorage('themes'),
      ]);

      setState((storage: IStorage) => ({
        ...storage,
        apiKey,
        room,
        theme,
        rooms,
        themes,
      }));
    }

    if (isConnected) {
      initStorage();
    }
  }, [isConnected]);

  const refreshThemes = async () => {
    let themes: ITheme[] = [];
    pushLoading();
    setLoadingMessage('Loading themes (1)');
    let _themes = (await api.current.diceBox.list()).data;

    const page = 2;
    while (_themes) {
      setLoadingMessage(`Loading themes (${page})`);
      themes = [...themes, ..._themes];
      _themes = (await api.current.diceBox.next())?.data;
    }
    storageProvider.setStorage({
      themes,
    });
    setState(state => ({
      ...state,
      themes,
    }));
    popLoading();
  };

  const refreshRooms = async () => {
    setLoadingMessage('Loading rooms list');
    pushLoading();
    const rooms = (await api.current.room.list()).data;
    storageProvider.setStorage({ rooms });
    setState(state => ({ ...state, rooms }));
    popLoading();
  };

  useEffect(() => {
    if (state.apiKey) {
      api.current = new ThreeDDiceAPI(state.apiKey);

      const load = async () => {
        pushLoading();

        try {
          if (!state.rooms || state.rooms.length === 0) {
            await refreshRooms();
          }

          if (!state.themes || state.themes.length === 0) {
            await refreshThemes();
          }
          popLoading();
        } catch (error) {
          setError('Problem connecting with dddice');
          clearLoading();
          return;
        }
      };

      load();
    }
  }, [state.apiKey]);

  useEffect(() => ReactTooltip.rebuild());

  const reloadDiceEngine = async () => {
    return undefined;
  };

  const preloadTheme = async (theme: ITheme) => {
    return sdkBridge.preloadTheme(theme);
  };

  const onJoinRoom = useCallback(async (roomSlug: string, passcode?: string) => {
    if (roomSlug) {
      setLoadingMessage('Joining room');
      pushLoading();
      await createGuestAccountIfNeeded();
      const room = state.rooms && state.rooms.find(r => r.slug === roomSlug);
      if (room) {
        onChangeRoom(room);
      } else {
        let newRoom;
        try {
          newRoom = (await api.current.room.join(roomSlug, passcode)).data;
        } catch (error) {
          setError('could not join room');
          clearLoading();
          throw error;
        }
        if (newRoom) {
          await storageProvider.setStorage({
            rooms: state.rooms ? [...state.rooms, newRoom] : [newRoom],
          });
          setState((storage: IStorage) => ({
            ...storage,
            rooms: storage.rooms ? [...storage.rooms, newRoom] : [newRoom],
          }));
          await onChangeRoom(newRoom);
        }
      }
      popLoading();
    }
  }, []);

  const onChangeRoom = useCallback(
    async (room: IRoom) => {
      // if room isn't in rooms list, assume it needs to be joined

      setState((storage: IStorage) => ({
        ...storage,
        room,
      }));

      ReactTooltip.hide();
      if (room) {
        await storageProvider.setStorage({ room });
        await reloadDiceEngine();
      }
    },
    [state.rooms],
  );

  const onCreateRoom = useCallback(async () => {
    setLoadingMessage('Creating Room');
    pushLoading();
    await createGuestAccountIfNeeded();
    let newRoom;
    try {
      newRoom = (await api.current.room.create()).data;
    } catch (error) {
      setError('could not create room');
      clearLoading();
      throw error;
    }
    if (newRoom) {
      await storageProvider.setStorage({
        rooms: state.rooms ? [...state.rooms, newRoom] : [newRoom],
      });
      setState((storage: IStorage) => ({
        ...storage,
        rooms: storage.rooms ? [...storage.rooms, newRoom] : [newRoom],
      }));
    }

    setState((storage: IStorage) => ({
      ...storage,
      room: newRoom,
    }));
    await storageProvider.setStorage({ room: newRoom });
    popLoading();
    await reloadDiceEngine();
  }, [state.rooms]);

  const onChangeTheme = useCallback((theme: ITheme) => {
    setState((storage: IStorage) => ({
      ...storage,
      theme,
    }));

    if (theme) {
      storageProvider.setStorage({ theme });
      preloadTheme(theme);
    }

    ReactTooltip.hide();
  }, []);

  const onKeySuccess = useCallback((apiKey: string) => {
    setState((storage: IStorage) => ({
      ...storage,
      apiKey,
      rooms: undefined,
      themes: undefined,
    }));
    storageProvider.setStorage({ apiKey });
    setIsEnterApiKey(false);
    reloadDiceEngine();
  }, []);

  const onSignOut = useCallback(() => {
    setState(DefaultStorage);
    storageProvider.setStorage({ apiKey: undefined });
    storageProvider.setStorage({ theme: undefined });
    if (game.user?.isGM) {
      storageProvider.setStorage({ room: undefined });
    }
    storageProvider.setStorage({ rooms: undefined });
    storageProvider.setStorage({ themes: undefined });
    setError(undefined);
    clearLoading();
  }, []);

  const onSwitchRoom = useCallback(async () => {
    onChangeRoom(undefined);
  }, []);

  const onSwitchTheme = useCallback(async () => {
    onChangeTheme(undefined);
  }, []);

  const createGuestAccountIfNeeded = useCallback(async () => {
    if (!state.apiKey || !api.current) {
      try {
        const apiKey = (await new ThreeDDiceAPI().user.guest()).data;
        api.current = new ThreeDDiceAPI(apiKey);
        setState((storage: IStorage) => ({
          ...storage,
          apiKey,
        }));
        await storageProvider.setStorage({ apiKey });
      } catch (error) {
        setError('could not create room');
        clearLoading();
        throw error;
      }
    }
  }, []);

  /**
   * Render
   */
  return (
    <div className="px-4 pt-2 pb-4 scroll">
      <ReactTooltip effect="solid" />
      {isConnected && (
        <>
          <div className="flex flex-row items-baseline justify-center">
            {isEnterApiKey ? (
              <span
                className="text-gray-700 text-xs mr-auto"
                onClick={() => setIsEnterApiKey(false)}
              >
                <Back className="flex h-4 w-4 m-auto" data-tip="Back" data-place="right" />
              </span>
            ) : (
              <a
                className="!text-gray-700 text-xs mr-auto"
                href="https://docs.dddice.com/guides/browser-extension.html"
                target="_blank"
              >
                <Help className="flex h-4 w-4 m-auto" data-tip="Help" data-place="right" />
              </a>
            )}
            <span className="text-gray-700 text-xs ml-auto cursor-pointer" onClick={onSignOut}>
              <LogOut className="flex h-4 w-4 m-auto" data-tip="Logout" data-place="left" />
            </span>
          </div>
        </>
      )}
      <div className="flex flex-col items-center justify-center">
        <img src={imageLogo} alt="dddice" />
        <span className="text-white text-lg">dddice</span>
      </div>
      {error && (
        <div className="text-gray-700 mt-4">
          <p className="text-center text-neon-red">{error}</p>
        </div>
      )}
      {isEnterApiKey ? (
        <ApiKeyEntry onSuccess={onKeySuccess} />
      ) : (
        isConnected && (
          <>
            {isLoading ? (
              <div className="flex flex-col justify-center text-gray-700 mt-4">
                <Loading className="flex h-10 w-10 animate-spin-slow m-auto" />
                <div className="flex m-auto">{loadingMessage}</div>
              </div>
            ) : (
              <>
                {(!state.apiKey || !state.room) && game.user?.isGM ? (
                  <RoomSelection
                    rooms={state.rooms}
                    onSelectRoom={onChangeRoom}
                    onJoinRoom={onJoinRoom}
                    onError={setError}
                    onConnectAccount={() => setIsEnterApiKey(true)}
                    onCreateRoom={onCreateRoom}
                    onRefreshRooms={refreshRooms}
                  />
                ) : !state.theme ? (
                  <ThemeSelection
                    themes={state.themes}
                    onSelectTheme={onChangeTheme}
                    onConnectAccount={() => setIsEnterApiKey(true)}
                    onRefreshThemes={refreshThemes}
                  />
                ) : (
                  <>
                    <Room
                      room={state.room || { name: 'No Room Selected' }}
                      onSwitchRoom={onSwitchRoom}
                      disabled={!game.user?.isGM}
                    />
                    <Theme theme={state.theme} onSwitchTheme={onSwitchTheme} />
                  </>
                )}
              </>
            )}
          </>
        )
      )}
      {!isConnected && (
        <div className="flex justify-center text-gray-700 mt-4">
          <span className="text-center text-gray-300">
            Not connected. Please navigate to a supported VTT.
          </span>
        </div>
      )}
      <p className="border-t border-gray-800 mt-4 pt-4 text-gray-700 text-xs text-center">
        {isConnected && (
          <>
            <span className="text-gray-300">Connected to {vtt}</span>
            <span className="text-gray-700">{' | '}</span>
          </>
        )}
        dddice {process.env.VERSION}
      </p>
    </div>
  );
};

export default DddiceSettings;
