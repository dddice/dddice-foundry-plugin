/** @format */
import {
  IRoll,
  IRoom,
  ITheme,
  IUser,
  ThreeDDice,
  ThreeDDiceAPI,
  ThreeDDiceRollEvent,
  ThreeDDiceRoomEvent,
} from 'dddice-js';
import { v4 as uuidv4 } from 'uuid';

import { ConfigPanel } from './module/ConfigPanel';
import createLogger from './module/log';
import {
  convertDddiceRollModelToFVTTRollModel,
  convertFVTTDiceEquation,
  convertFVTTRollModelToDddiceRollModel,
} from './module/rollFormatConverters';

const log = createLogger('module');
const pendingRollsFromShowForRoll = new Map<string, () => void>();

// to store last room slug, to de-dupe room changes
// by comparing room slugs and not whole objects (like foundry does automatically)
let roomSlug;

declare global {
  interface Window {
    dddice: ThreeDDice;
    api: ThreeDDiceAPI;
  }
}

let dddice: ThreeDDice;
let api: ThreeDDiceAPI;

const showForRoll = (...args) => {
  const room = getCurrentRoom();
  const theme = getCurrentTheme();

  const dddiceRoll = convertFVTTRollModelToDddiceRollModel([args[0]], theme?.id as string);
  const uuid = 'dsnFreeRoll:' + uuidv4();
  if (room && theme && dddiceRoll) {
    api.roll.create(dddiceRoll.dice, {
      room: room.slug,
      operator: dddiceRoll.operator,
      external_id: uuid,
    });
  }
  return new Promise<void>(resolve => {
    pendingRollsFromShowForRoll.set(uuid, resolve);
    //fall back resolver
    setTimeout(() => resolve(), 1500);
  });
};

Hooks.once('init', async () => {
  window.dddice = new ThreeDDice();

  // register static settings
  if (game instanceof Game) {
    game.settings.registerMenu('dddice', 'connect', {
      name: 'Settings',
      label: 'Configure dddice',
      hint: 'Configure dddice settings',
      icon: 'fa-solid fa-dice-d20',
      type: ConfigPanel,
      restricted: false,
    });

    game.settings.register('dddice', 'render mode', {
      name: 'Render Mode',
      hint: 'If render mode is set to "off" then dice rolls will not be rendered but dice will still be sent to your dddice room via the API',
      scope: 'client',
      default: 'on',
      type: String,
      choices: {
        on: 'on',
        off: 'off',
      },
      config: false,
      onChange: value => {
        log.debug('change render mode', value);
        setUpDddiceSdk();
      },
    });

    game.settings.register('dddice', 'apiKey', {
      name: 'Api Key',
      hint: 'Link to your dddice account with your api key. Generate one at https://dddice.com/account/developer',
      scope: 'client',
      default: '',
      type: String,
      config: false,
      onChange: async value => {
        if (value) {
          await setUpDddiceSdk();
          await syncUserNamesAndColors();
        }
      },
    });

    game.settings.register('dddice', 'room', {
      name: 'Room',
      hint: 'Choose a dice room, that you have already joined via dddice.com, to roll in',
      scope: 'world',
      type: String,
      default: '',
      config: false,
      restricted: true,
      onChange: async value => {
        if (value) {
          const room = JSON.parse(value);
          if (room?.slug && room?.slug !== roomSlug) {
            roomSlug = value.slug;
            await setUpDddiceSdk();
            await syncUserNamesAndColors();
          }
        }
      },
    });

    game.settings.register('dddice', 'theme', {
      name: 'Dice Theme',
      hint: 'Choose a dice theme from your dice box',
      scope: 'client',
      type: String,
      default: '',
      config: false,
      onChange: value => {
        if (value) {
          const theme = JSON.parse(value) as ITheme;
          if (dddice) {
            dddice.loadTheme(theme, true);
            dddice.loadThemeResources(theme.id, true);
          }
        }
      },
    });

    game.settings.register('dddice', 'rooms', {
      name: 'Rooms',
      hint: 'Cached Room Data',
      scope: 'client',
      type: Array,
      default: [],
      config: false,
    });

    game.settings.register('dddice', 'themes', {
      name: 'Dice Themes',
      hint: 'Cached Theme Data',
      scope: 'client',
      type: Array,
      default: [],
      config: false,
    });
  }

  document.body.addEventListener('click', () => {
    if (dddice && !dddice?.isDiceThrowing) {
      dddice.clear();
    }
  });
});

async function syncUserNamesAndColors() {
  if (getCurrentRoom() && (game as Game).user) {
    const room: IRoom = getCurrentRoom() as IRoom;
    const user: IUser = game.user?.getFlag('dddice', 'user') as IUser;
    log.debug('user', user);
    log.debug('room', room);
    const userParticipant = room.participants.find(
      ({ user: { uuid: participantUuid } }) => participantUuid === user?.uuid,
    );
    log.debug('syncUserNamesAndColors', userParticipant);
    if (userParticipant) {
      try {
        await api.room.updateParticipant(room.slug, userParticipant.id, {
          username: (game as Game).user?.name as string,
          color: `${(game as Game).user?.border as string}`,
        });
      } catch (e) {
        // log the error and continue
        // there seems to be a mystery 403 that could be
        // a race condition that I have yet to figure out
        // TODO: figure it out
        console.error(e);
      }
    }
  }
}

Hooks.once('ready', async () => {
  // if apiKey isn't set, create a guest account
  log.debug('ready hook');

  await setUpDddiceSdk();
  $(document).on('click', '.dddice-settings-button', event => {
    event.preventDefault();
    const menu = game.settings.menus.get('dddice.connect');
    const app = new menu.type();
    return app.render(true);
  });

  // pretend to be dice so nice, if it isn't set up so that we can capture roll
  // animation requests that are sent directly to it by "better 5e rolls"
  log.info('check for dice so nice', game.dice3d);
  if (!game.dice3d) {
    log.debug('DSN not there');
    // pretend to be dsn;
    game.dice3d = {
      isEnabled: () => true,
      showForRoll: (...args) => {
        log.debug('steal show for roll', ...args);
        return showForRoll(...args);
      },
    };
  }

  // update dddice room participant names
  await syncUserNamesAndColors();
});

Hooks.on('diceSoNiceRollStart', (messageId, rollData) => {
  log.debug('dice so nice roll start hook', messageId, rollData);

  // if there is no message id we presume dddice didn't know about this roll
  // and send it to the api
  if (!messageId) {
    showForRoll(rollData);
  }
});

Hooks.on('createChatMessage', async (chatMessage: ChatMessage) => {
  log.debug('calling Create Chat Message hook', chatMessage);
  const rolls = chatMessage?.isRoll && chatMessage?.rolls?.length > 0 ? chatMessage.rolls : null;
  if (rolls?.length > 0) {
    // remove the sound v10
    mergeObject(chatMessage, { '-=sound': null }, { performDeletions: true });

    if (game.settings.get('dddice', 'render mode') === 'on' && chatMessage.isContentVisible) {
      chatMessage._dddice_hide = true;
    }

    if (!chatMessage.flags?.dddice?.rollId) {
      const room = getCurrentRoom();
      const theme = getCurrentTheme();
      for (const roll of rolls) {
        try {
          const dddiceRoll = convertFVTTDiceEquation(roll, theme?.id);
          log.debug('formatted dddice roll', dddiceRoll);
          if (chatMessage.isAuthor && dddiceRoll.dice.length > 0) {
            let participantIds;
            const whisper: IUser[] = chatMessage.whisper.map(
              user =>
                (game as Game).users
                  .find((u: User) => u.id === user)
                  ?.getFlag('dddice', 'user') as IUser,
            );
            log.debug('whisper', whisper);
            if (whisper?.length > 0 && room?.participants) {
              if (
                chatMessage.isContentVisible &&
                !whisper.some(u => u.uuid === game.user.getFlag('dddice', 'user').uuid)
              ) {
                whisper.push(game.user.getFlag('dddice', 'user'));
              }
              participantIds = whisper
                .map(
                  (user: IUser) =>
                    room.participants.find(
                      ({ user: { uuid: participantUuid } }) => participantUuid === user?.uuid,
                    )?.id,
                )
                .filter(i => i);
            }

            const dddiceRollResponse: IRoll = (
              await api.roll.create(dddiceRoll.dice, {
                room: room?.slug,
                operator: dddiceRoll.operator,
                external_id: 'foundryVTT:' + chatMessage.uuid,
                whisper: participantIds,
                label: roll.options?.flavor,
              })
            ).data;

            await chatMessage.setFlag('dddice', 'rollId', dddiceRollResponse.uuid);
          }
        } catch (e) {
          console.error(e);
          ui.notifications?.error(`dddice | ${e.response?.data?.data?.message ?? e}`);
          $(`[data-message-id=${chatMessage.id}]`).removeClass('!dddice-hidden');
          window.ui.chat.scrollBottom({ popout: true });
          chatMessage._dddice_hide = false;
        }
      }
    }
  }
});

Hooks.on('updateChatMessage', (message, updateData, options) => {
  log.debug('calling Update Chat Message hook', message, updateData, options);
});

// add css to hide roll messages about to be deleted to prevent flicker
Hooks.on('renderChatMessage', (message, html, data) => {
  if (message._dddice_hide) {
    html.addClass('!dddice-hidden');
  }
});

Hooks.on('updateUser', async (user: User) => {
  if (user.isSelf) {
    await syncUserNamesAndColors();
  }
});

function getCurrentTheme() {
  try {
    return JSON.parse(game.settings.get('dddice', 'theme') as string) as ITheme;
  } catch {
    return undefined;
  }
}

function getCurrentRoom() {
  try {
    return JSON.parse(game.settings.get('dddice', 'room') as string) as IRoom;
  } catch {
    return undefined;
  }
}

async function createGuestUserIfNeeded() {
  let didSetup = false;
  const quitSetup = false;
  let justCreatedAnAccount = false;
  let apiKey = game.settings.get('dddice', 'apiKey') as string;
  if (!apiKey) {
    log.info('creating guest account');
    apiKey = (await new ThreeDDiceAPI(undefined, 'Foundry VTT').user.guest()).data;
    await game.settings.set('dddice', 'apiKey', apiKey);
    didSetup = true;
    justCreatedAnAccount = true;
  }
  api = new ThreeDDiceAPI(apiKey, 'Foundry VTT');

  const theme = game.settings.get('dddice', 'theme');
  if (theme) {
    try {
      JSON.parse(theme as string) as ITheme;
    } catch {
      didSetup = true;
      await game.settings.set('dddice', 'theme', JSON.stringify((await api.theme.get(theme)).data));
    }
  } else {
    log.info('pick random theme');
    didSetup = true;
    const themes = (await api.diceBox.list()).data.filter(theme =>
      Object.values(
        theme.available_dice
          .map(die => die.type ?? die)
          .reduce(
            (prev, curr) => {
              prev[curr] = true;
              return prev;
            },
            { d4: false, d6: false, d8: false, d10: false, d10x: false, d20: false },
          ),
      ).every(type => type),
    );
    await game.settings.set(
      'dddice',
      'theme',
      JSON.stringify(themes[Math.floor(Math.random() * themes.length)]),
    );
  }

  if ((!game.settings.get('dddice', 'room') || justCreatedAnAccount) && game.user?.isGM) {
    const oldRoom = window.localStorage.getItem('dddice.room');
    if (oldRoom) {
      log.info('migrating room');
      const room = (await api.room.get(oldRoom)).data;
      await game.settings.set('dddice', 'room', JSON.stringify(room));
      window.localStorage.removeItem('dddice.room');
    } else {
      log.info('getting room 0');
      let room = (await api.room.list()).data;
      if (room && room[0]) {
        await game.settings.set('dddice', 'room', JSON.stringify(room[0]));
      } else {
        log.info('creating room');
        room = (await api.room.create()).data;
        await game.settings.set('dddice', 'room', JSON.stringify(room));
      }
    }
    //quitSetup = true;
  } else {
    let room = getCurrentRoom();
    if (room?.slug) {
      try {
        room = (await api.room.join(room.slug)).data;
        if (game.user?.isGM) {
          await game.settings.set('dddice', 'room', JSON.stringify(room));
        }
      } catch (error) {
        log.warn('eating error', error.response?.data?.data?.message);
      }
    }
  }

  return [didSetup, quitSetup];
}

async function setUpDddiceSdk() {
  log.info('setting up dddice sdk');
  const [_, shouldStopSetup] = await createGuestUserIfNeeded();
  const apiKey = game.settings.get('dddice', 'apiKey') as string;
  const room = getCurrentRoom()?.slug;
  roomSlug = room;
  if (apiKey && room && !shouldStopSetup) {
    try {
      api = new ThreeDDiceAPI(apiKey, 'Foundry VTT');
      const user: IUser = (await api.user.get()).data;
      game.user?.setFlag('dddice', 'user', user);

      let canvas: HTMLCanvasElement = document.getElementById('dddice-canvas') as HTMLCanvasElement;

      if (dddice) {
        // clear the board
        if (canvas) {
          canvas.remove();
          canvas = undefined;
        }
        // disconnect from echo
        if (dddice.api?.connection) dddice.api.connection.disconnect();
        // stop the animation loop
        dddice.stop();
      }

      if (game.settings.get('dddice', 'render mode') === 'on') {
        log.info('render mode is on');
        if (!canvas) {
          // add canvas element to document
          canvas = document.createElement('canvas');
          canvas.id = 'dddice-canvas';
          // if the css fails to load for any reason, using tailwinds classes here
          // will disable the whole interface
          canvas.style.top = '0px';
          canvas.style.position = 'fixed';
          canvas.style.pointerEvents = 'none';
          canvas.style.zIndex = '100000';
          canvas.style.opacity = '100';
          canvas.style.height = '100vh';
          canvas.style.width = '100vw';
          document.body.appendChild(canvas);
          window.addEventListener(
            'resize',
            () => dddice && dddice.renderer && dddice.resize(window.innerWidth, window.innerHeight),
          );
        }
        dddice = new ThreeDDice().initialize(canvas, apiKey, undefined, 'Foundry VTT');
        dddice.start();
        dddice.connect(room, undefined, user.uuid);
        dddice.on(ThreeDDiceRollEvent.RollCreated, (roll: IRoll) => rollCreated(roll));
        dddice.off(ThreeDDiceRollEvent.RollFinished);
        dddice.on(ThreeDDiceRollEvent.RollFinished, (roll: IRoll) => rollFinished(roll));
        const theme = getCurrentTheme();
        dddice.loadTheme(theme).loadThemeResources(theme);
      } else {
        log.info('render mode is off');
        dddice = new ThreeDDice();
        dddice.api = new ThreeDDiceAPI(apiKey, 'Foundry VTT');
        dddice.api.connect(room, undefined, user.uuid);
        dddice.api.listen(ThreeDDiceRollEvent.RollCreated, (roll: IRoll) => rollCreated(roll));
      }

      dddice.api.listen(ThreeDDiceRoomEvent.RoomUpdated, async (room: IRoom) => {
        // if you are the gm update the shared room object stored in the world settings
        // that only gms have access too
        if (game.user?.isGM) {
          await game.settings.set('dddice', 'room', JSON.stringify(room));
        }

        // everyone updates their room list cache
        const updatedRoomCache = (await game.settings.get('dddice', 'rooms')).map(r =>
          r.slug === room.slug ? room : r,
        );
        game.settings.set('dddice', 'rooms', updatedRoomCache);
      });

      ui.notifications?.info('dddice is ready to roll!');
    } catch (e) {
      console.error(e);
      ui.notifications?.error(`dddice | ${e.response?.data?.data?.message ?? e}`);
      notConnectedMessage();
      return;
    }
  }

  if (!game.user.getFlag('dddice', 'welcomeMessageShown')) {
    sendWelcomeMessage();
    game.user.setFlag('dddice', 'welcomeMessageShown', true);
  }
}

const notConnectedMessage = () => {
  if ($(document).find('.dddice-not-connected').length === 0) {
    const message = {
      whisper: [game.user.id],
      speaker: { alias: 'dddice' },
      content: `
      <div class="message-content dddice-not-connected-message">
        <h3 class="nue">dddice | 3D Dice Roller</h3>
        <p class="nue">Your game has been configured to use the dddice 3D dice roller. However you are not properly connected to the system.</p>
        <p class="nue">please update your configuration in our settings.</p>
        <button class="dddice-settings-button"><i class="fa-solid fa-dice-d20"></i> dddice settings</span>
      </div>
    `,
    };
    ChatMessage.implementation.createDocuments([message]);
  }
};

const sendWelcomeMessage = () => {
  const theme: ITheme = getCurrentTheme();
  if ($(document).find('.dddice-welcome-message').length === 0) {
    const message = {
      whisper: [game.user.id],
      speaker: { alias: 'dddice' },
      content: `
      <div class="dddice-welcome-message">
        <h3 class="nue">dddice | 3D Dice Roller</h3>
        <p class="nue">Your game has been configured to use the dddice 3D dice roller.</p>
        <p class="nue">Everything is all set up and ready to roll! you will be rolling these dice:</p>
        <div class='dddice'>
          <div
            class="flex flex-col border bg-no-repeat bg-contain bg-center rounded border-gray-300 border-solid border-2 bg-gray-800 p-2 pl-1 mb-2"
            style="background-image: url(${theme.preview?.preview}); background-color: ${theme.label?.background_color}"
          >
            <div class="flex flex-row">
              <div class="flex text-white rounded bg-gray-800 bg-opacity-50 px-1 text-lg font-bold">
                ${theme.name}
              </div>
            </div>
          </div>
        </div>
        <p class="nue"> If you want to change your dice you can change them in our settings</p>
        <button class="dddice-settings-button"><i class="fa-solid fa-dice-d20"></i> dddice settings</span>
      </div>
    `,
    };
    ChatMessage.implementation.createDocuments([message]);
  }
};

const rollCreated = async (roll: IRoll) => {
  const chatMessages = game.messages?.filter(
    chatMessage => chatMessage.getFlag('dddice', 'rollId') === roll.uuid,
  );
  // if chat message doesn't exist, (for example a roll outside foundry) then add it in
  if (
    (!chatMessages || chatMessages.length == 0) &&
    !roll.external_id?.startsWith('dsnFreeRoll:') &&
    !roll.external_id?.startsWith('foundryVTT:')
  ) {
    let shouldIMakeTheChat = false;

    // If I made the roll outside of foundry
    if (roll.user.uuid === (game.user?.getFlag('dddice', 'user') as IUser).uuid)
      // I should make the chat
      shouldIMakeTheChat = true;
    if (
      // I am active user 0
      [...game.users.values()].filter(user => user.active)[0].isSelf &&
      // and user who made the roll in dddice isn't connected to the game
      [...game.users.values()].filter(
        user => user.active && (user.getFlag('dddice', 'user') as IUser).uuid === roll.user.uuid,
      ).length === 0
    ) {
      // then I should roll on their behalf
      shouldIMakeTheChat = true;
    }

    if (shouldIMakeTheChat) {
      const foundryVttRoll: Roll = convertDddiceRollModelToFVTTRollModel(roll);

      let whisper;
      if (roll.participants) {
        whisper = roll.participants.map(({ participant }) =>
          game.users.find(
            (user: User) => (user as User).getFlag('dddice', 'user').uuid === participant.user.uuid,
          ),
        );
      }

      await foundryVttRoll.toMessage(
        {
          whisper,
          speaker: {
            alias: roll.room.participants.find(
              participant => participant.user.uuid === roll.user.uuid,
            )?.username,
          },
          flags: {
            dddice: {
              rollId: roll.uuid,
            },
          },
        },
        { rollMode: roll.participants?.length > 0 ? 'gmroll' : 'publicroll', create: true },
      );
    }
  }
};

const rollFinished = async (roll: IRoll) => {
  const chatMessages = game.messages?.filter(
    chatMessage => chatMessage.getFlag('dddice', 'rollId') === roll.uuid,
  );
  if (chatMessages && chatMessages.length > 0) {
    chatMessages?.forEach(chatMessage => {
      $(`[data-message-id=${chatMessage.id}]`).removeClass('!dddice-hidden');
      chatMessage._dddice_hide = false;
    });
    window.ui.chat.scrollBottom({ popout: true });
  }

  if (roll.external_id) {
    if (pendingRollsFromShowForRoll.has(roll.external_id)) {
      const resolver = pendingRollsFromShowForRoll.get(roll.external_id);
      if (resolver) resolver();
      pendingRollsFromShowForRoll.delete(roll.external_id);
    }
  }
};

export { setUpDddiceSdk, syncUserNamesAndColors };
