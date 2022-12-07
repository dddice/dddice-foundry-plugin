/** @format */

export async function getStorage(key: string): Promise<any> {
  return new Promise(resolve => {
    const value = game.settings.get('dddice', key);
    if ((key === 'theme' || key === 'room') && value) {
      try {
        resolve(JSON.parse(value as string));
      } catch {
        resolve(undefined);
      }
    } else {
      resolve(value);
    }
  });
}

export async function setStorage(payload: object): Promise<any> {
  return Promise.all(
    Object.entries(payload).map(([key, value]) => game.settings.set('dddice', key, value)),
  );
}
