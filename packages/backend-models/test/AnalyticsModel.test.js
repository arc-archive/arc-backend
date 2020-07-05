import Emulator from 'google-datastore-emulator';
import { assert } from 'chai';
import { AnalyticsModel } from '../src/AnalyticsModel.js';
import DataHelper from './DataHelper.js';

/** @typedef {import('../src/AnalyticsModel').ActiveSession} ActiveSession */
/** @typedef {import('../src/AnalyticsModel').ActiveUser} ActiveUser */

describe('AnalyticsModel', () => {
  process.env.GCLOUD_PROJECT = 'advancedrestclient-1155';
  let emulator;
  before(async () => {
    const options = {};
    emulator = new Emulator(options);
    return emulator.start();
  });

  after(() => emulator.stop());

  /**
   * @param {AnalyticsModel} model
   * @param {string} applicationId
   * @return {Promise<ActiveSession[]>}
   */
  async function getSessionEntities(model, applicationId) {
    const query = model.store.createQuery(model.namespace, 'Session').filter('appId', '=', applicationId);
    const [entities] = await model.store.runQuery(query);
    return (entities || []).map((item) => model.fromDatastore(item));
  }

  /**
   * @param {AnalyticsModel} model
   * @param {string} applicationId
   * @return {Promise<ActiveUser[]>}
   */
  async function getUserEntities(model, applicationId) {
    const query = model.store.createQuery(model.namespace, 'User').filter('appId', '=', applicationId);
    const [entities] = await model.store.runQuery(query);
    return (entities || []).map((item) => model.fromDatastore(item));
  }

  let appIdCounter = 0;
  /**
   * @return {string}
   */
  const getAppId = () => `test-app-${appIdCounter++}`;

  describe('constructor()', () => {
    it('sets namespace', () => {
      const model = new AnalyticsModel();
      assert.equal(model.namespace, 'analytics');
    });
  });

  describe('createActiveSession()', () => {
    let model = /** @type AnalyticsModel */ (null);
    beforeEach(() => {
      model = new AnalyticsModel();
    });

    after(async () => {
      await DataHelper.deleteEntities(model, 'Session');
    });

    it('creates entity in the data store', async () => {
      const id = getAppId();
      await model.createActiveSession(id, Date.now());
      const result = await getSessionEntities(model, id);
      assert.lengthOf(result, 1);
    });

    it('returns the entity with newSession', async () => {
      const id = getAppId();
      const result = await model.createActiveSession(id, Date.now());
      assert.isTrue(result.newSession);
    });

    it('adds "appId" property', async () => {
      const id = getAppId();
      await model.createActiveSession(id, Date.now());
      const result = await getSessionEntities(model, id);
      assert.equal(result[0].appId, id);
    });

    it('adds "day" property', async () => {
      const id = getAppId();
      const time = Date.now();
      await model.createActiveSession(id, time);
      const result = await getSessionEntities(model, id);
      assert.equal(result[0].day, time);
    });

    it('adds "lastActive" property', async () => {
      const id = getAppId();
      const time = Date.now();
      await model.createActiveSession(id, time);
      const result = await getSessionEntities(model, id);
      assert.equal(result[0].lastActive, time);
    });
  });

  describe('ensureSession()', () => {
    let model = /** @type AnalyticsModel */ (null);
    beforeEach(() => {
      model = new AnalyticsModel();
    });

    after(async () => {
      await DataHelper.deleteEntities(model, 'Session');
    });

    it('creates a new entity', async () => {
      const id = getAppId();
      const time = Date.now();
      await model.ensureSession(id, time);
      const result = await getSessionEntities(model, id);
      assert.lengthOf(result, 1);
    });

    it('updates existing entity with current time', async () => {
      const id = getAppId();
      const time = Date.now();
      await model.createActiveSession(id, time - 100);
      await model.ensureSession(id, time);
      const result = await getSessionEntities(model, id);
      assert.equal(result[0].lastActive, time);
    });

    it('sets newSession to true when creating new session', async () => {
      const id = getAppId();
      const time = Date.now();
      const result = await model.ensureSession(id, time);
      assert.isTrue(result.newSession);
    });

    it('sets newSession to false when updating existing session', async () => {
      const id = getAppId();
      const time = Date.now();
      await model.createActiveSession(id, time - 100);
      const result = await model.ensureSession(id, time);
      assert.isFalse(result.newSession);
    });
  });

  describe('ensureUserRecord()', () => {
    let model = /** @type AnalyticsModel */ (null);
    beforeEach(() => {
      model = new AnalyticsModel();
    });

    after(async () => {
      await DataHelper.deleteEntities(model, 'Session');
    });

    it('creates a new user entity', async () => {
      const id = getAppId();
      const time = Date.now();
      await model.ensureUserRecord(id, time);
      const result = await getUserEntities(model, id);
      assert.lengthOf(result, 1);
    });

    it('creates a new user only once', async () => {
      const id = getAppId();
      const time = Date.now();
      await model.ensureUserRecord(id, time);
      await model.ensureUserRecord(id, time);
      const result = await getUserEntities(model, id);
      assert.lengthOf(result, 1);
    });

    it('returns user entity', async () => {
      const id = getAppId();
      const time = Date.now();
      const result = await model.ensureUserRecord(id, time);
      assert.equal(result.appId, id, 'has appId');
      assert.typeOf(result.day, 'number', 'has day');
    });
  });
});
