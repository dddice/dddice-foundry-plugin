/** @format */

import { ConfigPanel } from './module/ConfigPanel';
import API from './module/api';
import { IRoll, IUser } from 'dddice-js';
import createLogger from './module/log';

require('dddice-js');
const log = createLogger('engine');

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

async function setUpDddiceSdk() {
  const apiKey = game.settings.get('dddice', 'apiKey') as string;
  const room = game.settings.get('dddice', 'room') as string;
  if (apiKey && room) {
    try {
      (window as any).dddice = (window as any).dddice.initialize(
        document.getElementById('dddice-canvas'),
        apiKey,
      );
      (window as any).dddice.start();
      (window as any).dddice.connect(room);
      (window as any).dddice.removeAction('roll:finished');
      (window as any).dddice.addAction('roll:finished', roll => updateChat(roll));
      (window as any).api = new API(apiKey);
      (window as any).api
        .user()
        .get()
        .then(user => game.settings.set('dddice', 'user', user));
    } catch (e) {
      console.error(e);
      notConnectedMessage();
    }
  } else {
    notConnectedMessage();
  }
}

Hooks.once('ready', async () => {
  // add canvas element to document
  const canvasElement = document.createElement('canvas');
  canvasElement.id = 'dddice-canvas';
  canvasElement.className = 'fixed top-0 z-50 h-screen w-screen opacity-100 pointer-events-none';
  document.body.appendChild(canvasElement);
  await setUpDddiceSdk();
  $(document).on('click', '.dddice-settings-button', event => {
    event.preventDefault();
    const menu = game.settings.menus.get('dddice.connect');
    const app = new menu.type();
    return app.render(true);
  });
  window.addEventListener(
    'resize',
    () =>
      (window as any).dddice &&
      (window as any).dddice.resize(window.innerWidth, window.innerHeight),
  );
});

Hooks.on('createChatMessage', chatMessage => {
  if (chatMessage?.rolls?.length > 0) {
    const dddiceRoll = convertFVTTRollModelToDddiceRollModel(chatMessage.rolls);
    if (chatMessage.isAuthor) {
      (window as any).api
        .roll()
        .create({ ...dddiceRoll, room: game.settings.get('dddice', 'room') });
    }
    // hide the message because it will get created later by the dddice roll complete
    chatMessage._dddice_hide = true;

    // remove the sound
    mergeObject(chatMessage, { '-=sound': null }, { performDeletions: true });
  }
});

// add css to hide roll messages about to be deleted to prevent flicker
Hooks.on('renderChatMessage', (message, html, data) => {
  if (message._dddice_hide) {
    html.addClass('hidden');
  }
});

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

const updateChat = (roll: IRoll) => {
  log.debug(roll);
  if (roll.user.uuid === (game.settings.get('dddice', 'user') as IUser).uuid) {
    const dieEquation = Object.entries(
      roll.values
        .filter(die => !die.is_dropped)
        .reduce((prev, current) => {
          if (prev[current.type]) {
            prev[current.type] += current.type === 'mod' ? current.value : 1;
          } else {
            prev[current.type] = current.type === 'mod' ? current.value : 1;
          }
          return prev;
        }, {}),
    ).reduce(
      (prev, [type, count]) =>
        prev + (prev !== '' && count >= 0 ? '+' : '') + count + (type !== 'mod' ? type : ''),
      '',
    );

    ChatMessage.create({
      content: `<div class="dice-roll">
    <div class="dice-result">
        <div class="dice-formula">${dieEquation}</div>
        <h4 class="dice-total">${roll.total_value}</h4>
    </div>
</div>`,
      user: game.user._id,
      speaker: 'Celeste Bloodreign',
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    });
  }
};

const convertFVTTRollModelToDddiceRollModel = (
  fvttRolls: Roll[],
): { dice: IRoll; operator: object } => {
  log.debug(fvttRolls);
  const theme = game.settings.get('dddice', 'theme');
  let operator;
  return {
    dice: fvttRolls
      .flatMap(roll =>
        roll.terms
          .reduce((prev, next) => {
            // reduce to combine operators + or - with the numeric term after them
            if (next instanceof NumericTerm) {
              const multiplier = prev[prev.length - 1].operator === '-' ? -1 : 1;
              prev[prev.length - 1] = { type: 'mod', value: next.number * multiplier, theme };
            } else {
              prev.push(next);
            }
            return prev;
          }, [])
          .flatMap(term => {
            if (term instanceof DiceTerm) {
              return term.results.map(result => {
                if (term.modifiers.indexOf('kh1') !== -1) {
                  operator = { k: 'h1' };
                } else if (term.modifiers.indexOf('kl1') !== -1) {
                  operator = { k: 'l1' };
                }
                return { type: `d${term.faces}`, value: result.result, theme };
              });
            } else if (term.type === 'mod') {
              return term;
            } else {
              return null;
            }
          }),
      )
      .filter(i => i),
    operator,
  };
};
