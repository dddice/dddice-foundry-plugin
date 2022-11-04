/** @format */
import { ConfigPanel } from './module/ConfigPanel';
import API from './module/api';
import { IRoll } from 'dddice-js';
import createLogger from './module/log';
import {
  convertDddiceRollModelToFVTTRollModel,
  convertDiceSoNiceRollToDddiceRoll,
  convertFVTTRollModelToDddiceRollModel,
} from './module/rollFormatConverters';
const log = createLogger('module');

require('dddice-js');

Hooks.once('init', async () => {
  (window as any).dddice = new (window as any).ThreeDDice();

  game.settings.registerMenu('dddice', 'connect', {
    name: 'Account',
    label: 'Connect to dddice',
    hint: 'Link to your dddice account with your api key. Generate one at https://dddice.com/account/developer',
    icon: 'fa-solid fa-cloud-exclamation',
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
    onChange: () => window.location.reload(),
  });

  game.settings.register('dddice', 'apiKey', {
    name: 'Api Key',
    hint: 'Link to your dddice account with your api key. Generate one at https://dddice.com/account/developer',
    scope: 'client',
    default: '',
    type: String,
    config: false,
    onChange: setUpDddiceSdk,
  });

  game.settings.register('dddice', 'user', {
    name: 'dddice user',
    hint: '',
    scope: 'client',
    default: '',
    type: Object,
    config: false,
  });

  game.settings.register('dddice', 'room', {
    name: 'Room',
    hint: 'Choose a dice room, that you have already joined via dddice.com, to roll in',
    scope: 'client',
    type: String,
    default: '',
    config: false,
    onChange: setUpDddiceSdk,
  });

  game.settings.register('dddice', 'theme', {
    name: 'Dice Theme',
    hint: 'Choose a dice theme from your dice box',
    scope: 'client',
    type: String,
    default: '',
    config: false,
  });

  document.body.addEventListener('click', () => (window as any).dddice.clear());
});

Hooks.once('ready', async () => {
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
        const theme = game.settings.get('dddice', 'theme');
        (window as any).api.roll().create({
          ...convertDiceSoNiceRollToDddiceRoll(args[0], theme),
          room: game.settings.get('dddice', 'room'),
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
    const theme = game.settings.get('dddice', 'theme');
    (window as any).api.roll().create({
      ...convertDiceSoNiceRollToDddiceRoll(rollData.roll, theme),
      room: game.settings.get('dddice', 'room'),
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

    if (!chatMessage.flags?.dddice?.rollId && !chatMessage?.data.flags?.dddice?.rollId) {
      const dddiceRoll = convertFVTTRollModelToDddiceRollModel(rolls);
      log.debug('formatted dddice roll', dddiceRoll);
      if (chatMessage.isAuthor && dddiceRoll.dice.length > 0) {
        if (game.settings.get('dddice', 'render mode') === 'on') {
          chatMessage._dddice_hide = true;
        }
        const dddiceRollResponse: IRoll = await (window as any).api
          .roll()
          .create({ ...dddiceRoll, room: game.settings.get('dddice', 'room') });

        chatMessage._dddiceRollId = dddiceRollResponse.uuid;
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

async function setUpDddiceSdk() {
  const apiKey = game.settings.get('dddice', 'apiKey') as string;
  const room = game.settings.get('dddice', 'room') as string;
  if (apiKey && room) {
    try {
      (window as any).api = new API(apiKey);
      (window as any).api
        .user()
        .get()
        .then(user => game.settings.set('dddice', 'user', user));
      if (game.settings.get('dddice', 'render mode') === 'on') {
        (window as any).dddice = (window as any).dddice.initialize(
          document.getElementById('dddice-canvas'),
          apiKey,
        );
        (window as any).dddice.start();
        (window as any).dddice.connect(room);
        (window as any).dddice.on('RollCreateEvent', () => null);
        (window as any).dddice.removeAction('roll:finished');
        (window as any).dddice.addAction('roll:finished', roll => updateChat(roll));
      } else {
        (window as any).dddice.api = new (window as any).ThreeDDiceAPI(apiKey);
        (window as any).dddice.api.connect(room);
        (window as any).dddice.api.listen('RollCreateEvent', roll => updateChat(roll.data));
      }
    } catch (e) {
      console.error(e);
      notConnectedMessage();
    }
  } else {
    notConnectedMessage();
  }
}

const notConnectedMessage = () => {
  if ($(document).find('.dddice-settings-button').length === 0) {
    const message = {
      whisper: [game.user.id],
      speaker: { alias: 'dddice' },
      content: `
      <div class="message-content">
        <h3 class="nue">dddice | 3D Dice Roller</h3>
        <p class="nue">Your game has been configured to use the dddice 3D dice roller. However you are not properly connected to the system.</p>
        <p class="nue">please update your API key and dice room selection in our settings.</p>
        <button class="dddice-settings-button"><i class="fa-solid fa-cloud-exclamation"></i> dddice settings</button>
      </div>
    `,
    };
    ChatMessage.implementation.createDocuments([message]);
  }
};

const updateChat = async (roll: IRoll) => {
  const chatMessages = game.messages?.filter(
    chatMessage => chatMessage._dddiceRollId === roll.uuid,
  );
  if (chatMessages && chatMessages.length > 0) {
    chatMessages?.forEach(chatMessage => {
      $(`[data-message-id=${chatMessage.id}]`).removeClass('hidden');
      chatMessage._dddice_hide = false;
    });
    window.ui.chat.scrollBottom({ popout: true });
  } else {
    // if (roll.user.uuid === (game.settings.get('dddice', 'user') as IUser).uuid) {
    // whisper messages from external rolls to all connected parties
    const foundryVttRoll: Roll = convertDddiceRollModelToFVTTRollModel(roll);
    const message = await foundryVttRoll.toMessage(
      {
        speaker: {
          alias: roll.room.participants.find(
            participant => participant.user.uuid === roll.user.uuid,
          ).username,
        },
        whisper: [game.user.id],
        flags: { dddice: { rollId: roll.uuid } },
      },
      { create: false },
    );
    ChatMessage.implementation.createDocuments([message]);
  }
};
