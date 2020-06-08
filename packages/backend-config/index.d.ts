export * from 'nconf';

/**
 * Checks whether configuration value has been set.
 */
export declare function checkConfig(setting: string): void;

/**
 * To be called by API app.
 */
export function ckeckApiConfig(): void;

/**
 * To be called by GitHub integration app.
 */
export function ckeckGitHubConfig(): void;

/**
 * To be called by GitHub integration app.
 */
export function ckeckTestsConfig(): void;
