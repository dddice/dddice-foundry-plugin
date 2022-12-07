/** @format */

import React from 'react';
import ReactDOM from 'react-dom/client';

import { IRoom, ITheme, ThreeDDiceAPI } from 'dddice-js';

import App from './App';
import StorageProvider from './storage';

export class ConfigPanel extends FormApplication {
  private configOptions: any;
  private connectionStatus = '\u00A0'; // use nbsp to reserve screen real estate in popup, jank, i know.
  private statusColor = '';
  private rooms: IRoom[] = [];
  private themes: ITheme[] = [];
  private loading = false;
  private connected = false;

  constructor(configOptions) {
    super();
    this.configOptions = configOptions;
    this.render(true, { height: 500 });
  }

  activateListeners(html: JQuery) {
    super.activateListeners(html);
    const root = ReactDOM.createRoot(document.getElementById('dddice'));
    root.render(<App storageProvider={new StorageProvider()} />);
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['form'],
      popOut: true,
      closeOnSubmit: false,
      template: 'modules/dddice/templates/ConfigPanel.html',
      id: 'dddice-config-panel',
      title: 'dddice | configuration',
    });
  }
}
