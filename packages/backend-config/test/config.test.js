import { assert } from 'chai';
import { default as config, ckeckApiConfig, ckeckGitHubConfig, ckeckTestsConfig } from '../index.js';

describe('backend-config', () => {
  describe('ckeckApiConfig()', () => {
    afterEach(() => config.defaults([]));

    it('throws when no configuration', () => {
      assert.throws(() => {
        ckeckApiConfig();
      });
    });

    it('passes when config is OK', () => {
      config.defaults({
        GCLOUD_PROJECT: 'test',
        PORT: 8080,
        MEMCACHE_URL: 'localhost:11211',
        OAUTH2_CLIENT_ID: 'cid',
        OAUTH2_CLIENT_SECRET: 'csec',
        OAUTH2_CALLBACK: 'http://localhost:8080/auth/callback',
        SECRET: 'any',
      });
      ckeckApiConfig();
    });
  });

  describe('ckeckGitHubConfig()', () => {
    afterEach(() => config.defaults([]));

    it('throws when no configuration', () => {
      assert.throws(() => {
        ckeckGitHubConfig();
      });
    });

    it('passes when config is OK', () => {
      config.defaults({
        GCLOUD_PROJECT: 'test',
        PORT: 8080,
        GPG_KEY: 'GPG-key',
        CI_EMAIL: 'me',
        CI_NAME: 'mail',
        GPG_KEY_PASS: 'passwd',
        GITHUB_SSH_KEY: 'a',
        GITHUB_SSH_KEY_PUB: 'b',
        GITHUB_SSH_KEY_PASS: 'c',
        WEBHOOK_SECRET: 'd',
        NPM_TOKEN: 'e',
      });
      ckeckGitHubConfig();
    });
  });

  describe('ckeckTestsConfig()', () => {
    afterEach(() => config.defaults([]));

    it('throws when no configuration', () => {
      assert.throws(() => {
        ckeckTestsConfig();
      });
    });

    it('passes when config is OK', () => {
      config.defaults({
        GCLOUD_PROJECT: 'test',
        PORT: 8080,
        GPG_KEY: 'GPG-key',
        CI_EMAIL: 'me',
        CI_NAME: 'mail',
        GPG_KEY_PASS: 'passwd',
        GITHUB_SSH_KEY: 'a',
        GITHUB_SSH_KEY_PUB: 'b',
        GITHUB_SSH_KEY_PASS: 'c',
      });
      ckeckTestsConfig();
    });
  });
});
