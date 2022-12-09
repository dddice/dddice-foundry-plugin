/** @format */

import React from 'react';
import ReactDOM from 'react-dom/client';

import DddiceSettings from './DddiceSettings';
import StorageProvider from './StorageProvider';
import SdkBridge from './SdkBridge';

export class ConfigPanel extends FormApplication {
  constructor(configOptions) {
    super();
    this.render(true, { height: 500 });
  }

  activateListeners(html: JQuery) {
    super.activateListeners(html);
    const root = ReactDOM.createRoot(document.getElementById('dddice'));
    root.render(
      <DddiceSettings storageProvider={new StorageProvider()} sdkBridge={new SdkBridge()} />,
    );
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

  protected _updateObject(event: Event, formData: object | undefined): Promise<unknown> {
    return Promise.resolve(undefined);
  }
}
