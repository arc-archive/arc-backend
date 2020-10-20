/* eslint-disable import/no-extraneous-dependencies */
import chaiPkg from 'chai';
import { default as config, checkApiConfig, checkGitHubConfig, checkTestsConfig } from '../index.js';

const { assert } = chaiPkg;

describe('backend-config', () => {
  describe('checkApiConfig()', () => {
    afterEach(() => config.defaults([]));

    it('throws when no configuration', () => {
      assert.throws(() => {
        checkApiConfig();
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
      checkApiConfig();
    });
  });

  describe('checkGitHubConfig()', () => {
    afterEach(() => config.defaults([]));

    it('throws when no configuration', () => {
      assert.throws(() => {
        checkGitHubConfig();
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
      checkGitHubConfig();
    });
  });

  describe('checkTestsConfig()', () => {
    afterEach(() => config.defaults([]));

    it('throws when no configuration', () => {
      assert.throws(() => {
        checkTestsConfig();
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
      checkTestsConfig();
    });
  });
});
