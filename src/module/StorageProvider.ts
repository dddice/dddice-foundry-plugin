/** @format */

export default class StorageProvider {
  async getStorage(key: string): Promise<any> {
    return new Promise(resolve => {
      const value = game.settings.get('dddice', key);
      if (key === 'theme') {
        try {
          resolve(JSON.parse(value as string));
        } catch {
          resolve(undefined);
        }
      } else if (key === 'room') {
        try {
          resolve(JSON.parse(value as string));
        } catch {
          resolve(undefined);
        }
      } else if (key === 'rooms' || key === 'themes') {
        if (value.length === 0) {
          resolve(undefined);
        } else {
          resolve(value);
        }
      } else {
        resolve(value);
      }
    });
  }

  async setStorage(payload: object): Promise<any> {
    return Promise.all(
      Object.entries(payload).map(([key, value]) => {
        if (key === 'theme' || key === 'room') {
          game.settings.set('dddice', key, JSON.stringify(value));
        } else {
          game.settings.set('dddice', key, value);
        }
      }),
    );
  }

  async removeStorage(key: string): Promise<any> {
    return undefined;
  }
}
