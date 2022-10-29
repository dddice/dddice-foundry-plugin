/** @format */
CONFIG.debug.hooks = true;
import { ConfigPanel } from './module/ConfigPanel';
import API from './module/api';
import { IRoll, IUser } from 'dddice-js';
import createLogger from './module/log';

require('dddice-js');
const log = createLogger('module');

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
        (window as any).dddice.removeAction('roll:finished');
        (window as any).dddice.addAction('roll:finished', roll => updateChat(roll));
      }
    } catch (e) {
      console.error(e);
      notConnectedMessage();
    }
  } else {
    notConnectedMessage();
  }
}

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

function convertDiceSoNiceRollToDddiceRoll(roll, theme) {
  let operator;
  const dice = roll.dice.flatMap(term => {
    return term.results.flatMap(result => {
      if (term.modifiers.indexOf('kh1') !== -1) {
        operator = { k: 'h1' };
      } else if (term.modifiers.indexOf('kl1') !== -1) {
        operator = { k: 'l1' };
      }
      if (term.faces === 100) {
        return [
          { type: `d10`, value: result.result % 10, theme },
          {
            type: `d10x`,
            value: Math.floor(result.result / 10),
            value_to_display: `${Math.floor(result.result / 10)}0`,
            theme,
          },
        ];
      } else {
        return { type: `d${term.faces}`, value: result.result, theme };
      }
    });
  });
  return { operator, dice };
}

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

Hooks.on('createChatMessage', chatMessage => {
  log.debug('calling Create Chat Message hook', chatMessage);

  // massage v9 and v10
  const rolls =
    chatMessage?.rolls?.length > 0
      ? chatMessage.rolls
      : chatMessage.roll?.terms.length > 0
      ? [chatMessage.roll]
      : null;
  if (rolls?.length > 0) {
    const dddiceRoll = convertFVTTRollModelToDddiceRollModel(rolls);
    log.debug('formatted dddice roll', dddiceRoll);
    if (chatMessage.isAuthor && dddiceRoll.dice.length > 0) {
      (window as any).api
        .roll()
        .create({ ...dddiceRoll, room: game.settings.get('dddice', 'room') });
      // hide the message because it will get created later by the dddice roll complete
      if (game.settings.get('dddice', 'render mode') === 'on') {
        chatMessage._dddice_hide = true;
      }

      // remove the sound v10
      mergeObject(chatMessage, { '-=sound': null }, { performDeletions: true });

      // remove the sound v9
      if (chatMessage.data) {
        mergeObject(chatMessage.data, { '-=sound': null });
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

    const data = {
      content: `<div class="dice-roll">
    <div class="dice-result">
        <div class="dice-formula">${dieEquation}</div>
        <h4 class="dice-total">${roll.total_value}</h4>
    </div>
</div>`,
      user: game.user._id,
      speaker: 'Celeste Bloodreign',
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    };

    if (!foundry.utils.isNewerVersion(game.version, 10)) {
      data['roll'] = new Roll();
    }

    ChatMessage.create(data);
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
              if (prev.length > 0) {
                const multiplier = prev[prev.length - 1].operator === '-' ? -1 : 1;
                prev[prev.length - 1] = { type: 'mod', value: next.number * multiplier, theme };
              }
            } else {
              prev.push(next);
            }
            return prev;
          }, [])
          .flatMap(term => {
            if (term instanceof DiceTerm) {
              return term.results.flatMap(result => {
                if (term.modifiers.some(x => x === 'kh1' || x === 'kh') !== -1) {
                  operator = { k: 'h1' };
                } else if (term.modifiers.some(x => x === 'kl1' || x === 'kl') !== -1) {
                  operator = { k: 'l1' };
                }
                if (term.faces === 100) {
                  return [
                    { type: `d10`, value: result.result % 10, theme },
                    {
                      type: `d10x`,
                      value: Math.floor(result.result / 10),
                      value_to_display: `${Math.floor(result.result / 10)}0`,
                      theme,
                    },
                  ];
                } else {
                  return { type: `d${term.faces}`, value: result.result, theme };
                }
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
