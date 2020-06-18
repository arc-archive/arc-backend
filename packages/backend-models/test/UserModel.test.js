import Emulator from 'google-datastore-emulator';
import { assert } from 'chai';
import Chance from 'chance';
import { UserModel } from '../src/UserModel.js';

/** @typedef {import('../src/UserModel').UserEntity} UserEntity */
/** @typedef {import('../src/PassportProfile').PassportProfile} PassportProfile */

const chance = new Chance();

describe('UserModel', () => {
  process.env.GCLOUD_PROJECT = 'advancedrestclient-1155';
  let emulator;
  before(async () => {
    const options = {};
    emulator = new Emulator(options);
    return emulator.start();
  });

  after(() => emulator.stop());

  describe('constructor()', () => {
    it('sets namespace', () => {
      const model = new UserModel();
      assert.equal(model.namespace, 'api-components-users');
    });
  });

  /**
   * @return {Promise<void>}
   */
  async function emptyEntities() {
    const model = new UserModel();
    const query = model.store.createQuery(model.namespace, model.buildKind);
    const [entities] = await model.store.runQuery(query);
    if (!entities.length) {
      return;
    }
    const keys = entities.map((item) => item[model.store.KEY]);
    await model.store.delete(keys);
  }

  /**
   * @return {PassportProfile}
   */
  function generateEntity() {
    return {
      provider: 'google',
      id: chance.word(),
      displayName: chance.name(),
      emails: [{ value: chance.email() }],
      photos: [{ value: chance.url() }],
    };
  }

  /**
   * @param {number} sample
   * @return {Promise<object>}
   */
  async function populateEntities(sample=10) {
    const model = new UserModel();
    const promises = Array(sample).fill(0).map(() => model.createUser(generateEntity()));
    return Promise.all(promises);
  }

  describe('createUser()', () => {
    let model = new UserModel();
    before(() => {
      model = new UserModel();
    });

    after(() => emptyEntities());

    it('returns id of created user', async () => {
      const result = await model.createUser(generateEntity());
      assert.typeOf(result, 'string');
    });

    it('created user is not org user by default', async () => {
      const id = await model.createUser(generateEntity());
      const result = await model.get(id);
      assert.isFalse(result.orgUser);
    });

    it('is org user for mulesoft domain', async () => {
      const profile = generateEntity();
      profile.emails = [{ value: 'me@mulesoft.com' }];
      const id = await model.createUser(profile);
      const result = await model.get(id);
      assert.isTrue(result.orgUser);
    });

    it('is org user for salesforce domain', async () => {
      const profile = generateEntity();
      profile.emails = [{ value: 'me@salesforce.com' }];
      const id = await model.createUser(profile);
      const result = await model.get(id);
      assert.isTrue(result.orgUser);
    });

    it('ignores missing imageUrl', async () => {
      const profile = generateEntity();
      delete profile.photos;
      const id = await model.createUser(profile);
      const result = await model.get(id);
      assert.isUndefined(result.imageUrl);
    });

    it('ignores missing email', async () => {
      const profile = generateEntity();
      delete profile.emails;
      const id = await model.createUser(profile);
      const result = await model.get(id);
      assert.isUndefined(result.email);
    });

    it('stores refresh token', async () => {
      const profile = generateEntity();
      const id = await model.createUser(profile, 'test-token');
      const result = await model.get(id);
      assert.equal(result.refreshToken, 'test-token');
    });
  });

  describe('findOrCreateUser()', () => {
    let model = new UserModel();
    let generated;
    before(async () => {
      generated = await populateEntities(1);
      assert.lengthOf(generated, 1);
      model = new UserModel();
    });

    after(() => emptyEntities());

    it('returns existing user', async () => {
      const profile = {
        id: generated[0],
        provider: 'google',
        displayName: 'test-dn',
      };
      const result = await model.findOrCreateUser(profile);
      assert.notEqual(result.displayName, 'test-dn');
    });

    it('creates new user', async () => {
      const profile = generateEntity();
      const result = await model.findOrCreateUser(profile);
      assert.typeOf(result, 'object');
    });
  });
});
