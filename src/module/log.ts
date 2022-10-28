/**
 * Main Logger
 * Creates a "warn", "error", "info", and "debug" loggers for a given pathname
 *
 * @format
 */

import debug from 'debug';

const NS = `dddice-foundry-module`;

function createLogger(name: string, level: string) {
  return debug(`${NS}:${name}:${level}`);
}

/**
 * Create a logger
 *
 * **Example:**
 *
 * ```
 * import createLogger from '@dice/logger'
 *
 * const log = createLogger(__filename)
 * ```
 */
export default function logger(name: string) {
  return {
    debug: createLogger(name, 'debug'),
    error: createLogger(name, 'error'),
    info: createLogger(name, 'info'),
    warn: createLogger(name, 'warn'),
  };
}
