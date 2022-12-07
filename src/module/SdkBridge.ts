/** @format */

import { ITheme } from 'dddice-js';

export default class SdkBridge {
  preloadTheme(theme: ITheme) {
    (window as any).dddice.loadTheme(theme, true);
    (window as any).dddice.loadThemeResources(theme.id, true);
  }
}
