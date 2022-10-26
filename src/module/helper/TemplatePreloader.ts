/** @format */

export class TemplatePreloader {
  /**
   * Preload a set of templates to compile and cache them for fast access during rendering
   */
  static async preloadHandlebarsTemplates() {
    const templatePaths = ['modules/dddice/templates/ConfigPanel.html'];
    return loadTemplates(templatePaths);
  }
}
