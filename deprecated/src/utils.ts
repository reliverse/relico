/** Quick dev environment check. */
function isDevEnv(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Logs a "FATAL" error, triggers a debugger in dev, and throws an error.
 */
export const shouldNeverHappen = (msg?: string, ...args: any[]): never => {
  console.error(msg, ...args);
  if (isDevEnv()) {
    /* eslint-disable no-debugger */
    // biome-ignore lint/suspicious/noDebugger: intentional for debugging fatal errors
    debugger;
  }

  throw new Error(`This should never happen: ${msg}`);
};
