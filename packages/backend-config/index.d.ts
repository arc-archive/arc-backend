export * from 'nconf';

/**
 * Checks whether configuration value has been set.
 */
export declare function checkConfig(setting: string): void;

/**
 * To be called by API app.
 */
export function checkApiConfig(): void;

/**
 * To be called by GitHub integration app.
 */
export function checkGitHubConfig(): void;

/**
 * To be called by GitHub integration app.
 */
export function checkTestsConfig(): void;
