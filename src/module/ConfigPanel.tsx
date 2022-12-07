/** @format */

import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import StorageProvider from './StorageProvider';
import SdkBridge from './SdkBridge';

export class ConfigPanel extends FormApplication {
  private configOptions: any;

  constructor(configOptions) {
    super();
    this.configOptions = configOptions;
    this.render(true, { height: 500 });
  }

  activateListeners(html: JQuery) {
    super.activateListeners(html);
    const root = ReactDOM.createRoot(document.getElementById('dddice'));
    root.render(<App storageProvider={new StorageProvider()} sdkBridge={new SdkBridge()} />);
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
