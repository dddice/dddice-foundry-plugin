/** @format */
import { ConfigPanel } from './module/ConfigPanel';
import {
  IRoll,
  IRoom,
  ITheme,
  IUser,
  ThreeDDice,
  ThreeDDiceAPI,
  ThreeDDiceRollEvent,
} from 'dddice-js';
import createLogger from './module/log';
import {
  convertDddiceRollModelToFVTTRollModel,
  convertDiceSoNiceRollToDddiceRoll,
  convertFVTTRollModelToDddiceRollModel,
} from './module/rollFormatConverters';
import SdkBridge from './module/SdkBridge';

const log = createLogger('module');

require('dddice-js');

Hooks.once('init', async () => {
  (window as any).dddice = new (window as any).ThreeDDice();

  // register static settings
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
    config: true,
    requiresReload: true,
  });

  game.settings.register('dddice', 'apiKey', {
    name: 'Api Key',
    hint: 'Link to your dddice account with your api key. Generate one at https://dddice.com/account/developer',
    scope: 'client',
    default: '',
    type: String,
    config: false,
  });

  game.settings.register('dddice', 'room', {
    name: 'Room',
    hint: 'Choose a dice room, that you have already joined via dddice.com, to roll in',
    scope: 'world',
    type: String,
    default: '',
    config: false,
    requiresReload: true,
    restricted: true,
    onChange: value => value && setUpDddiceSdk(),
  });

  game.settings.register('dddice', 'theme', {
    name: 'Dice Theme',
    hint: 'Choose a dice theme from your dice box',
    scope: 'client',
    type: String,
    default: '',
    config: false,
  });

  game.settings.register('dddice', 'rooms', {
    name: 'Rooms',
    hint: 'Cached Room Data',
    scope: 'client',
    type: Array,
    default: [],
    config: false,
    restricted: true,
  });

  game.settings.register('dddice', 'themes', {
    name: 'Dice Themes',
    hint: 'Cached Theme Data',
    scope: 'client',
    type: Array,
    default: [],
    config: false,
  });

  document.body.addEventListener('click', () => {
    if (!(window as any).dddice.isDiceThrowing) {
      (window as any).dddice.clear();
    }
  });
});

Hooks.once('ready', async () => {
  // if apiKey isn't set, create a guest account
  log.debug('ready hook');

  if (game.settings.get('dddice', 'render mode') === 'on') {
    // add canvas element to document
    const canvasElement = document.createElement('canvas');
    canvasElement.id = 'dddice-canvas';
    canvasElement.className = 'fixed top-0 h-screen w-screen opacity-100 pointer-events-none';
    canvasElement.setAttribute('style', 'z-index:1000');
    document.body.appendChild(canvasElement);
    window.addEventListener(
      'resize',
      () =>
        (window as any).dddice &&
        (window as any).dddice.renderer &&
        (window as any).dddice.resize(window.innerWidth, window.innerHeight),
    );
  }

  await setUpDddiceSdk();
  $(document).on('click', '.dddice-settings-button', event => {
    event.preventDefault();
    const menu = game.settings.menus.get('dddice.connect');
    const app = new menu.type();
    return app.render(true);
  });

  // pretend to be dice so nice, if it isn't set up so that we can capture roll
  // animation requests that are sent directly to it by "better 5e rolls"
  if (!game.dice3d) {
    game.dice3d = {
      isEnabled: () => true,
      showForRoll: (...args) => {
        log.debug('steal show for roll', ...args);
        const room = getCurrentRoom();
        const theme = getCurrentTheme();
        const dddiceRoll = convertDiceSoNiceRollToDddiceRoll(args[0], theme.id);
        (window as any).api.roll.create(dddiceRoll.dice, {
          room: room.slug,
          operator: dddiceRoll.operator,
        });
      },
    };
  }
});

Hooks.on('diceSoNiceRollStart', (messageId, rollData) => {
  log.debug('dice so nice roll start hook', messageId, rollData);

  // if there is no message id we presume dddice didn't know about this roll
  // and send it to the api
  if (!messageId) {
    const room = getCurrentRoom();
    const theme = getCurrentTheme();
    const dddiceRoll = convertDiceSoNiceRollToDddiceRoll(rollData.roll, theme.id);
    (window as any).api.roll.create(dddiceRoll.dice, {
      room: room.slug,
      operator: dddiceRoll.operator,
    });
  }
});

Hooks.on('createChatMessage', async chatMessage => {
  log.debug('calling Create Chat Message hook', chatMessage);
  // massage v9 and v10
  const rolls =
    chatMessage?.rolls?.length > 0
      ? chatMessage.rolls
      : chatMessage.roll?.terms.length > 0
      ? [chatMessage.roll]
      : null;
  if (rolls?.length > 0) {
    // remove the sound v10
    mergeObject(chatMessage, { '-=sound': null }, { performDeletions: true });

    // remove the sound v9
    if (chatMessage.data) {
      mergeObject(chatMessage.data, { '-=sound': null });
    }

    if (game.settings.get('dddice', 'render mode') === 'on') {
      chatMessage._dddice_hide = true;
    }

    if (!chatMessage.flags?.dddice?.rollId && !chatMessage?.data.flags?.dddice?.rollId) {
      const room = getCurrentRoom();
      const theme = getCurrentTheme();
      const dddiceRoll = convertFVTTRollModelToDddiceRollModel(rolls, theme.id);
      log.debug('formatted dddice roll', dddiceRoll);
      if (chatMessage.isAuthor && dddiceRoll.dice.length > 0) {
        try {
          const dddiceRollResponse: IRoll = (
            await (window as any).api.roll.create(dddiceRoll.dice, {
              room: room.slug,
              operator: dddiceRoll.operator,
            })
          ).data;

          await chatMessage.setFlag('dddice', 'rollId', dddiceRollResponse.uuid);
        } catch (e) {
          console.error(e);
          ui.notifications?.error(`dddice | ${e}`);
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
    html.addClass('hidden');
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
  let quitSetup = false;
  let apiKey = game.settings.get('dddice', 'apiKey') as string;
  if (!apiKey) {
    log.info('creating guest account');
    apiKey = (await new ThreeDDiceAPI().user.guest()).data;
    await game.settings.set('dddice', 'apiKey', apiKey);
    didSetup = true;
  }
  (window as any).api = new ThreeDDiceAPI(apiKey);

  if (!game.settings.get('dddice', 'theme')) {
    log.info('pick random theme');
    const themes = (await (window as any).api.diceBox.list()).data.filter(theme =>
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
    await game.settings.set('dddice', 'theme', themes[Math.floor(Math.random() * themes.length)]);
    didSetup = true;
  }

  if (!game.settings.get('dddice', 'room') && game.user?.isGM) {
    log.info('creating room');
    const room = (await (window as any).api.room.create()).data;
    await game.settings.set('dddice', 'room', room);
    quitSetup = true;
  } else {
    const room = getCurrentRoom();
    if (room.slug) {
      try {
        await (window as any).api.room.join(room.slug);
      } catch (error) {
        log.warn('eating error', error);
      }
    }
  }

  return [didSetup, quitSetup];
}

async function setUpDddiceSdk() {
  log.info('setting up dddice sdk');
  const [shouldSendWelcomeMessage, shouldStopSetup] = await createGuestUserIfNeeded();
  const apiKey = game.settings.get('dddice', 'apiKey') as string;
  const room = getCurrentRoom()?.slug;
  if (apiKey && room && !shouldStopSetup) {
    try {
      (window as any).api = new ThreeDDiceAPI(apiKey);
      const user: IUser = (await (window as any).api.user.get()).data;
      game.user?.setFlag('dddice', 'user', user);

      const canvas: HTMLCanvasElement = document.getElementById(
        'dddice-canvas',
      ) as HTMLCanvasElement;

      if (game.settings.get('dddice', 'render mode') === 'on' && canvas) {
        (window as any).dddice = new ThreeDDice(canvas, apiKey);
        (window as any).dddice.start();
        (window as any).dddice.connect(room);
        (window as any).dddice.on(ThreeDDiceRollEvent.RollCreated, (roll: IRoll) =>
          rollCreated(roll),
        );
        (window as any).dddice.off(ThreeDDiceRollEvent.RollFinished);
        (window as any).dddice.on(ThreeDDiceRollEvent.RollFinished, (roll: IRoll) =>
          rollFinished(roll),
        );
        new SdkBridge().preloadTheme(getCurrentTheme());
      } else {
        (window as any).dddice = new ThreeDDice();
        (window as any).dddice.api = new ThreeDDiceAPI(apiKey);
        (window as any).dddice.api.connect(room);
        (window as any).dddice.api.listen(ThreeDDiceRollEvent.RollCreated, (roll: IRoll) =>
          rollCreated(roll),
        );
      }
      ui.notifications?.info('dddice is ready to roll!');
    } catch (e) {
      console.error(e);
      ui.notifications?.error(e);
      notConnectedMessage();
      return;
    }
  }

  if (shouldSendWelcomeMessage) {
    sendWelcomeMessage();
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
      <div class="message-content dddice-welcome-message">
        <h3 class="nue">dddice | 3D Dice Roller</h3>
        <p class="nue">Your game has been configured to use the dddice 3D dice roller.</p>
        <p class="nue">Everything is all set up and ready to roll! you will be rolling these dice:</p>
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
  if (!chatMessages || chatMessages.length == 0) {
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
      await foundryVttRoll.toMessage(
        {
          speaker: {
            alias: roll.room.participants.find(
              participant => participant.user.uuid === roll.user.uuid,
            ).username,
          },
          flags: {
            dddice: {
              rollId: roll.uuid,
            },
          },
        },
        { create: true },
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
      $(`[data-message-id=${chatMessage.id}]`).removeClass('hidden');
      chatMessage._dddice_hide = false;
    });
    window.ui.chat.scrollBottom({ popout: true });
  }
};
