/** @format */

export default class PermissionProvider {
  canChangeRoom() {
    return game.user?.isGM;
  }
}
