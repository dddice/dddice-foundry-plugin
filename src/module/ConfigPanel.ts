/** @format */

import API, { IRoom, ITheme } from './api';

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
    const apiKey = game.settings.get('dddice', 'apiKey');
    if (apiKey) {
      this.connectToDddice(apiKey);
    }
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

  getData() {
    return {
      connectionStatus: this.connectionStatus,
      statusColor: this.statusColor,
      rooms: this.rooms.map(room => {
        if (room.slug === game.settings.get('dddice', 'room')) {
          return { ...room, selected: 'selected' };
        } else {
          return { ...room, selected: '' };
        }
      }),
      themes: this.themes.map(theme => {
        if (theme.id === game.settings.get('dddice', 'theme')) {
          return { ...theme, selected: 'selected' };
        } else {
          return { ...theme, selected: '' };
        }
      }),
      theme: game.settings.get('dddice', 'theme'),
      apiKey: game.settings.get('dddice', 'apiKey'),
      loading: this.loading,
      controls: !this.connected || this.loading ? 'disabled' : '',
    };
  }

  protected async _updateObject(event: Event, formData: object | undefined): Promise<unknown> {
    if (formData && event.submitter.id === 'dddice-connect-button') {
      await this.connectToDddice(formData['dddice-apiKey']);
    } else if (formData) {
      if (formData['dddice-apiKey']) {
        await game.settings.set('dddice', 'apiKey', formData['dddice-apiKey']);
      }
      if (formData['dddice-room']) {
        await game.settings.set('dddice', 'room', formData['dddice-room']);
      }
      if (formData['dddice-theme']) {
        await game.settings.set('dddice', 'theme', formData['dddice-theme']);
      }
      await this.close();
    }
  }

  private async connectToDddice(apiKey: string) {
    try {
      this.loading = true;
      this.connected = false;
      this.render();
      await this.maximize();
      await game.settings.set('dddice', 'apiKey', apiKey);
      const api = new API(apiKey);
      (window as any).dddice = new (window as any).ThreeDDice(
        document.getElementById('dddice'),
        apiKey,
      );
      let themes;
      [this.rooms, themes] = await Promise.all([api.room().list(), api.diceBox().list()]);
      this.rooms = this.rooms.sort((a, b) => a.name.localeCompare(b.name));
      while (themes) {
        this.themes = [...this.themes, ...themes].sort((a, b) => a.name.localeCompare(b.name));
        themes = await api.diceBox().next();
      }
      this.statusColor = 'text-success';
      this.connectionStatus = 'successfully connected to dddice';
      this.connected = true;
    } catch (error) {
      console.error(error);
      this.connected = false;
      this.statusColor = 'text-error';
      this.connectionStatus = 'Unable to connect to dddice, please check your API key';
    } finally {
      this.loading = false;
      this.render();
    }
  }
}
