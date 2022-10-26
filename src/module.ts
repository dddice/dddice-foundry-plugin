/** @format */

import { ConfigPanel } from './module/ConfigPanel';

require('dddice-js');
(window as any).dddice = undefined;

Hooks.once('init', async () => {
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
  });

  game.settings.register('dddice', 'room', {
    name: 'Room',
    hint: 'Choose a dice room, that you have already joined via dddice.com, to roll in',
    scope: 'client',
    type: String,
    default: '',
    config: false,
  });

  game.settings.register('dddice', 'theme', {
    name: 'Dice Theme',
    hint: 'Choose a dice theme from your dice box',
    scope: 'client',
    type: String,
    default: '',
    config: false,
  });
});

Hooks.once('ready', async () => {});
