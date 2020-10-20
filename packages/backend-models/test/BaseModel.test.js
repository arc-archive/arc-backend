import pkg from 'chai';
const { assert } = pkg;
import { Datastore } from '@google-cloud/datastore';
import { BaseModel } from '../src/BaseModel.js';

describe('BaseModel', () => {
  process.env.GCLOUD_PROJECT = 'advancedrestclient-1155';

  describe('constructor()', () => {
    it('sets namespace', () => {
      const model = new BaseModel('test');
      assert.equal(model.namespace, 'test');
    });

    it('sets store instance', () => {
      const model = new BaseModel('test');
      assert.isTrue(model.store instanceof Datastore);
    });

    it('sets listLimit', () => {
      const model = new BaseModel('test');
      assert.equal(model.listLimit, 25);
    });
  });

  describe('getters', () => {
    let model;
    beforeEach(() => {
      model = new BaseModel('test');
    });

    [
      ['NO_MORE_RESULTS', 'NO_MORE_RESULTS'],
      ['testKind', 'Test'],
      ['componentsKind', 'Component'],
      ['versionsKind', 'Version'],
      ['groupsKind', 'Group'],
      ['organizationKind', 'Organization'],
      ['testLogsKind', 'TestComponentLogs'],
      ['userKind', 'User'],
      ['tokenKind', 'Jwt'],
      ['buildKind', 'Build'],
      ['messageKind', 'Messages'],
      ['dependencyKind', 'Dependency'],
      ['coverageRunKind', 'CoverageTest'],
      ['coverageComponentKind', 'ComponentVersionCoverageResult'],
      ['apicUsersNamespace', 'api-components-users'],
      ['apicTestsNamespace', 'api-components-tests'],
      ['buildsNamespace', 'apic-github-builds'],
      ['coverageNamespace', 'api-components-coverage'],
    ].forEach(([prop, value]) => {
      it(`has ${prop} property`, () => {
        assert.equal(model[prop], value);
      });

      it(`is readonly ${prop} property`, () => {
        assert.throws(() => {
          model[prop] = 'test';
        });
      });
    });
  });

  describe('slug()', () => {
    let model = new BaseModel('test');
    beforeEach(() => {
      model = new BaseModel('test');
    });

    it('creates a slug value', () => {
      const input = 'MyTest Value';
      const result = model.slug(input);
      assert.equal(result, 'my-test-value');
    });
  });

  describe('fromDatastore()', () => {
    let model = new BaseModel('test');
    beforeEach(() => {
      model = new BaseModel('test');
    });

    it('adds name as from a datastore key', () => {
      const key = model.store.key({
        namespace: 'test',
        path: ['a', 'b'],
      });
      const obj = {
        [model.store.KEY]: key,
        test: true,
      };
      const result = model.fromDatastore(obj);
      assert.equal(result.id, 'b');
    });

    it('adds id as from a datastore key', () => {
      const key = model.store.key(['posts', 123]);
      const obj = {
        [model.store.KEY]: key,
        test: true,
      };
      const result = model.fromDatastore(obj);
      assert.equal(result.id, 123);
    });
  });
});
