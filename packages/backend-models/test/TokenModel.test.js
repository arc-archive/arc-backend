import Emulator from 'google-datastore-emulator';
import pkg from 'chai';
const { assert } = pkg;
import { TokenModel } from '../index.js';
import DataHelper from './DataHelper.js';

/** @typedef {import('../src/TokenModel').EditableToken} EditableToken */
/** @typedef {import('../src/TokenModel').TokenEntity} TokenEntity */
/** @typedef {import('../src/TokenModel').TokenInfo} TokenInfo */
/** @typedef {import('../src/UserModel').UserEntity} UserEntity */

describe('TokenModel', () => {
  process.env.GCLOUD_PROJECT = 'advancedrestclient-1155';

  let emulator;
  before(async () => {
    const options = {};
    emulator = new Emulator(options);
    return emulator.start();
  });

  after(() => emulator.stop());

  /**
   * @param {TokenModel} model
   * @param {string} userId
   * @param {string} tokenId
   * @return {Promise<TokenEntity>}
   */
  async function getEntry(model, userId, tokenId) {
    const key = model.createUserTokenKey(userId, tokenId);
    const [result] = await model.store.get(key);
    return model.fromDatastore(result);
  }

  describe('create()', () => {
    let model = /** @type TokenModel */ (null);
    beforeEach(() => {
      model = new TokenModel();
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.tokenKind);
    });

    it('returns created entity', async () => {
      const user = DataHelper.generateUserEntity();
      const token = DataHelper.generateToken(user, {
        scopes: ['all'],
        expires: 3600,
      });
      const tokenInfo = DataHelper.verifyToken(token);
      const result = await model.create(user, tokenInfo, token);
      assert.typeOf(result, 'object', 'returns an object');
      assert.typeOf(result.id, 'string', 'has datastore ID');
    });

    it('adds "token" property', async () => {
      const user = DataHelper.generateUserEntity();
      const token = DataHelper.generateToken(user, {
        scopes: ['all'],
        expires: 3600,
      });
      const tokenInfo = DataHelper.verifyToken(token);
      const result = await model.create(user, tokenInfo, token);
      assert.equal(result.token, token);
    });

    it('adds "scopes" property', async () => {
      const user = DataHelper.generateUserEntity();
      const token = DataHelper.generateToken(user, {
        scopes: ['all'],
        expires: 3600,
      });
      const tokenInfo = DataHelper.verifyToken(token);
      const result = await model.create(user, tokenInfo, token);
      assert.deepEqual(result.scopes, ['all']);
    });

    it('adds "issuer" property', async () => {
      const user = DataHelper.generateUserEntity();
      const token = DataHelper.generateToken(user, {
        scopes: ['all'],
        expires: 3600,
      });
      const tokenInfo = DataHelper.verifyToken(token);
      const result = await model.create(user, tokenInfo, token);
      assert.deepEqual(result.issuer, {
        id: user.id,
        displayName: user.displayName,
      });
    });

    it('adds "created" property', async () => {
      const user = DataHelper.generateUserEntity();
      const token = DataHelper.generateToken(user, {
        scopes: ['all'],
        expires: 3600,
      });
      const tokenInfo = DataHelper.verifyToken(token);
      const result = await model.create(user, tokenInfo, token);
      assert.typeOf(result.created, 'number');
    });

    it('adds "expires" property', async () => {
      const user = DataHelper.generateUserEntity();
      const token = DataHelper.generateToken(user, {
        scopes: ['all'],
        expires: 3600,
      });
      const tokenInfo = DataHelper.verifyToken(token);
      const result = await model.create(user, tokenInfo, token);
      assert.typeOf(result.expires, 'number');
    });

    it('ignores "expires" property when not set', async () => {
      const user = DataHelper.generateUserEntity();
      const token = DataHelper.generateToken(user, {
        scopes: ['all'],
      });
      const tokenInfo = DataHelper.verifyToken(token);
      const result = await model.create(user, tokenInfo, token);
      assert.isUndefined(result.expires);
    });

    it('adds "name" property', async () => {
      const user = DataHelper.generateUserEntity();
      const token = DataHelper.generateToken(user, {
        scopes: ['all'],
        expires: 3600,
      });
      const tokenInfo = DataHelper.verifyToken(token);
      const result = await model.create(user, tokenInfo, token, 'test-name');
      assert.equal(result.name, 'test-name');
    });

    it('created enty is in the data store', async () => {
      const user = DataHelper.generateUserEntity();
      const token = DataHelper.generateToken(user, {
        scopes: ['all'],
        expires: 3600,
      });
      const tokenInfo = DataHelper.verifyToken(token);
      const entity = await model.create(user, tokenInfo, token, 'test-name');
      const result = await getEntry(model, user.id, entity.id);
      assert.typeOf(result, 'object', 'returns an object');
    });
  });

  describe('find()', () => {
    let model = /** @type TokenModel */ (null);
    let token = /** @type string */ (null);
    beforeEach(async () => {
      model = new TokenModel();

      const user = DataHelper.generateUserEntity();
      token = DataHelper.generateToken(user, {
        scopes: ['all'],
        expires: 3600,
      });
      const tokenInfo = DataHelper.verifyToken(token);
      await model.create(user, tokenInfo, token);
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.tokenKind);
    });

    it('returns the token', async () => {
      const result = await model.find(token);
      assert.typeOf(result, 'object', 'returns an object');
    });

    it('returns null when not found', async () => {
      const result = await model.find('some-value');
      assert.equal(result, null);
    });
  });

  describe('get()', () => {
    let model = /** @type TokenModel */ (null);
    let token = /** @type string */ (null);
    let createdId = /** @type string */ (null);
    let user = /** @type UserEntity */ (null);
    beforeEach(async () => {
      model = new TokenModel();
      user = DataHelper.generateUserEntity();
      token = DataHelper.generateToken(user, {
        scopes: ['all'],
        expires: 3600,
      });
      const tokenInfo = DataHelper.verifyToken(token);
      const entity = await model.create(user, tokenInfo, token);
      createdId = entity.id;
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.tokenKind);
    });

    it('returns the token', async () => {
      const result = await model.get(user.id, createdId);
      assert.typeOf(result, 'object', 'returns an object');
    });

    it('returns null when not found for the user', async () => {
      const result = await model.get(user.id, 'non-existing');
      assert.equal(result, null);
    });

    it('returns null when not found for the token', async () => {
      const result = await model.get('non-existing', createdId);
      assert.equal(result, null);
    });
  });

  describe('list()', () => {
    let model = /** @type TokenModel */ (null);
    let user = /** @type UserEntity */ (null);
    beforeEach(async () => {
      model = new TokenModel();
    });

    before(async () => {
      const m = new TokenModel();
      user = DataHelper.generateUserEntity();
      await DataHelper.populateTokens(m, user);
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.tokenKind);
    });

    it('returns query result', async () => {
      const result = await model.list(user.id);
      assert.typeOf(result, 'object', 'result is an object');
      assert.typeOf(result.pageToken, 'string', 'has page token');
      assert.typeOf(result.entities, 'array', 'has entities');
    });

    it('returns default amount of entities', async () => {
      const result = await model.list(user.id);
      assert.lengthOf(result.entities, 25, 'has 25 entities');
    });

    it('respects the limit', async () => {
      const result = await model.list(user.id, {
        limit: 10,
      });
      assert.lengthOf(result.entities, 10, 'has 10 entities');
    });

    it('respects the page token', async () => {
      const result1 = await model.list(user.id, {
        limit: 10,
      });
      const result2 = await model.list(user.id, {
        limit: 100,
        pageToken: result1.pageToken,
      });
      assert.lengthOf(result2.entities, 15, 'has the remaining entities');
    });
  });

  describe('revoke()', () => {
    let model = /** @type TokenModel */ (null);
    let token = /** @type string */ (null);
    let createdId = /** @type string */ (null);
    let user = /** @type UserEntity */ (null);
    beforeEach(async () => {
      model = new TokenModel();
      user = DataHelper.generateUserEntity();
      token = DataHelper.generateToken(user, {
        scopes: ['all'],
        expires: 3600,
      });
      const tokenInfo = DataHelper.verifyToken(token);
      const entity = await model.create(user, tokenInfo, token);
      createdId = entity.id;
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.tokenKind);
    });

    it('sets revoked proeprty', async () => {
      await model.revoke(user.id, createdId);
      const result = await getEntry(model, user.id, createdId);
      assert.isTrue(result.revoked);
    });
  });

  describe('delete()', () => {
    let model = /** @type TokenModel */ (null);
    let token = /** @type string */ (null);
    let createdId = /** @type string */ (null);
    let user = /** @type UserEntity */ (null);
    beforeEach(async () => {
      model = new TokenModel();
      user = DataHelper.generateUserEntity();
      token = DataHelper.generateToken(user, {
        scopes: ['all'],
        expires: 3600,
      });
      const tokenInfo = DataHelper.verifyToken(token);
      const entity = await model.create(user, tokenInfo, token);
      createdId = entity.id;
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.tokenKind);
    });

    it('removes the token from the data store', async () => {
      await model.delete(user.id, createdId);
      const result = await model.get(user.id, createdId);
      assert.equal(result, null);
    });
  });
});
