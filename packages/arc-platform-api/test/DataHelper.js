import Chance from 'chance';
import jwt from 'jsonwebtoken';

/** @typedef {import('@advanced-rest-client/backend-models').BaseModel} BaseModel */
/** @typedef {import('@advanced-rest-client/backend-models').entity.Key} Key */
/** @typedef {import('./DataHelper').ComponentInsertOptions} ComponentInsertOptions */
/** @typedef {import('./DataHelper').ComponentInsertResult} ComponentInsertResult */
/** @typedef {import('./DataHelper').CreateComponentVersionResult} CreateComponentVersionResult */
/** @typedef {import('@advanced-rest-client/backend-models').EditableCoverageEntity} EditableCoverageEntity */
/** @typedef {import('@advanced-rest-client/backend-models').CoverageModel} CoverageModel */
/** @typedef {import('@advanced-rest-client/backend-models').CoverageEntity} CoverageEntity */
/** @typedef {import('@advanced-rest-client/backend-models').CoverageResult} CoverageResult */
/** @typedef {import('@advanced-rest-client/backend-models').CoverageSummaryResult} CoverageSummaryResult */
/** @typedef {import('@advanced-rest-client/backend-models').CoverageReport} CoverageReport */
/** @typedef {import('@advanced-rest-client/backend-models').CoverageFileResult} CoverageFileResult */
/** @typedef {import('@advanced-rest-client/backend-models').DependencyEntry} DependencyEntry */
/** @typedef {import('@advanced-rest-client/backend-models').DependencyModel} DependencyModel */
/** @typedef {import('@advanced-rest-client/backend-models').TestReport} TestReport */
/** @typedef {import('@advanced-rest-client/backend-models').TestBrowserResult} TestBrowserResult */
/** @typedef {import('@advanced-rest-client/backend-models').TestComponentModel} TestComponentModel */
/** @typedef {import('@advanced-rest-client/backend-models').AmfTest} AmfTest */
/** @typedef {import('@advanced-rest-client/backend-models').BottomUpTest} BottomUpTest */
/** @typedef {import('@advanced-rest-client/backend-models').TestModel} TestModel */
/** @typedef {import('@advanced-rest-client/backend-models').UserEntity} UserEntity */
/** @typedef {import('@advanced-rest-client/backend-models').PassportProfile} PassportProfile */
/** @typedef {import('@advanced-rest-client/backend-models').EditableToken} EditableToken */
/** @typedef {import('@advanced-rest-client/backend-models').TokenEntity} TokenEntity */
/** @typedef {import('@advanced-rest-client/backend-models').TokenInfo} TokenInfo */
/** @typedef {import('@advanced-rest-client/backend-models').TokenModel} TokenModel */
/** @typedef {import('./DataHelper').TokenCreateInfo} TokenCreateInfo */

const chance = new Chance();
const packageScopes = ['@advanced-rest-client', '@anypoint-web-components', '@api-components', '@api-modeling'];
// const orgs = ['advanced-rest-client', 'anypoint-web-components', 'api-modeling'];
const SECRET = 'test-abc-secret';
const tokenIssuer = 'urn:arc-ci';

/**
 * Data processing helper for models
 */
class DataHelper {
  /**
   * @param {BaseModel} model
   * @param {string} kind
   * @return {Promise<void>}
   */
  async deleteEntities(model, kind) {
    const query = model.store.createQuery(model.namespace, kind);
    const [entities] = await model.store.runQuery(query);
    if (!entities.length) {
      return;
    }
    const keys = entities.map((item) => item[model.store.KEY]);
    await model.store.delete(keys);
  }

  /**
   * @param {BaseModel} model
   * @param {string=} name
   * @return {Promise<Key>}
   */
  async insertComponentGroup(model, name) {
    let nameValue = name;
    if (!nameValue) {
      nameValue = chance.word();
    }
    const key = model.store.key({
      namespace: model.namespace,
      path: [model.groupsKind, model.slug(name)],
    });
    const entity = {
      key,
      data: {
        name,
      },
    };
    await model.store.upsert(entity);
    return key;
  }

  /**
   * @param {BaseModel} model
   * @param {ComponentInsertOptions=} opts
   * @return {Promise<ComponentInsertResult>}
   */
  async insertComponent(model, opts={}) {
    const {
      name = chance.word(),
      version ='1.0.0',
      group = chance.word(),
      pkg = chance.word(),
      org = chance.word(),
    } = opts;
    const versions = [version];
    await this.insertComponentGroup(model, group);
    const key = model.store.key({
      namespace: model.namespace,
      path: [model.groupsKind, model.slug(group), model.componentsKind, model.slug(name)],
    });
    const entity = {
      key,
      data: {
        name,
        version,
        versions,
        group,
        pkg,
        org,
      },
    };
    await model.store.upsert(entity);
    return {
      key,
      name,
      group,
      version,
      versions,
      pkg,
      org,
    };
  }

  /**
   * @return {CreateComponentVersionResult}
   */
  generateComponentVersion() {
    const group = chance.word();
    const component = chance.word();
    const version = '1.0.0';
    const pkg = chance.word();
    const org = chance.word();
    const docs = chance.sentence();
    const changeLog = chance.paragraph();
    return { group, component, version, pkg, org, docs, changeLog };
  }

  /**
   * @return {EditableCoverageEntity}
   */
  generateCoverageModel() {
    return {
      component: chance.word(),
      org: chance.word(),
      tag: chance.word(),
      branch: chance.word(),
      creator: {
        id: chance.guid(),
        displayName: chance.name(),
      },
    };
  }

  /**
   * @param {CoverageModel} model
   * @param {number} sample
   * @return {Promise<CoverageEntity[]>}
   */
  async populateCoverageEntities(model, sample=10) {
    const promises = Array(sample).fill(0).map(() => model.insert(this.generateCoverageModel()));
    return Promise.all(promises);
  }

  /**
   * @param {number=} sample Files sample
   * @return {CoverageResult}
   */
  generateCoverageReport(sample) {
    return {
      summary: this.generateCoverageReportSummary(),
      details: this.generateCoverageReportDetails(sample),
    };
  }

  /**
   * @return {CoverageSummaryResult}
   */
  generateCoverageReportSummary() {
    return {
      functions: chance.integer({ min: 0, max: 100 }),
      lines: chance.integer({ min: 0, max: 100 }),
      branches: chance.integer({ min: 0, max: 100 }),
      coverage: chance.integer({ min: 0, max: 100 }),
    };
  }

  /**
   * @param {number=} [sample=1]
   * @return {CoverageReport[]}
   */
  generateCoverageReportDetails(sample=1) {
    return Array(sample).fill(0).map(() => {
      const functions = this.generateCoverageFileResult();
      const lines = this.generateCoverageFileResult();
      const branches = this.generateCoverageFileResult();
      const coverage = chance.integer({ min: 0, max: 100 });
      return {
        functions,
        lines,
        branches,
        coverage,
        file: chance.word(),
      };
    });
  }

  /**
   * @return {CoverageFileResult}
   */
  generateCoverageFileResult() {
    const found = chance.integer({ min: 10, max: 500 });
    const hit = chance.integer({ min: 0, max: found });
    return {
      hit,
      found,
    };
  }

  /**
   * @return {string} Random package name
   */
  generatePackageName() {
    const scope = chance.pick(packageScopes);
    return `${scope}/${chance.word()}-${chance.word()}`;
  }

  /**
   * @param {string=} dependency A dependency to insert
   * @return {DependencyEntry}
   */
  generateDependencyEntry(dependency) {
    const dependencies = Array(chance.integer({ min: 1, max: 10 })).fill(0).map(() => this.generatePackageName());
    const devDependencies = Array(chance.integer({ min: 1, max: 10 })).fill(0).map(() => this.generatePackageName());
    if (dependency) {
      dependencies.push(dependency);
      devDependencies.push(dependency);
    }
    const pkg = this.generatePackageName();
    const name = pkg.split('/')[1];
    return {
      org: chance.word(),
      pkg,
      name,
      dependencies,
      devDependencies,
    };
  }

  /**
   * @param {DependencyModel} model
   * @param {number} sample
   * @return {Promise<string[]>}
   */
  populateDependenciesEntities(model, sample=10) {
    const dependencies = [];
    const promises = Array(sample).fill(0).map(() => {
      const last = dependencies[dependencies.length - 1];
      const d = this.generateDependencyEntry(last ? last.pkg : undefined);
      dependencies[dependencies.length] = d;
      return model.set(d);
    });
    return Promise.all(promises);
  }

  /**
   * @return {TestBrowserResult}
   */
  generateTestBrowserResult() {
    return {
      browser: `${chance.word()} ${chance.word()} ${chance.word()}`,
      endTime: chance.timestamp(),
      startTime: chance.timestamp(),
      total: chance.integer({ min: 10 }),
      success: chance.integer({ min: 10 }),
      failed: chance.integer({ min: 1 }),
      skipped: chance.integer({ min: 10 }),
      error: chance.integer({ min: 10 }),
      message: chance.sentence(),
      logs: chance.sentence(),
    };
  }

  /**
   * @param {number} [results=2]
   * @return {TestReport}
   */
  generateTestReport(results=2) {
    return {
      error: chance.bool(),
      total: chance.integer({ min: 10 }),
      success: chance.integer({ min: 10 }),
      failed: chance.integer({ min: 1 }),
      skipped: chance.integer({ min: 10 }),
      results: Array(results).fill(0).map(() => this.generateTestBrowserResult()),
    };
  }

  /**
   * @param {TestComponentModel} model
   * @param {string=} testId
   * @param {number=} sample
   * @return {Promise<void>}
   */
  async populateComponentTestReports(model, testId='test123', sample=25) {
    const transaction = model.store.transaction();
    await transaction.run();
    Array(sample).fill(0).forEach(() => {
      const component = this.generatePackageName();
      const key = model.createTestComponentKey(testId, component);
      const entity = {
        key,
        data: {
          component,
          status: 'running',
          startTime: Date.now(),
        },
      };
      transaction.upsert(entity);
    });
    await transaction.commit();
  }

  /**
   * @return {AmfTest}
   */
  generateAmfTestEntity() {
    return {
      type: 'amf',
      amfBranch: 'stage',
      creator: {
        id: chance.guid(),
        displayName: chance.name(),
      },
      purpose: chance.sentence(),
    };
  }

  /**
   * @return {BottomUpTest}
   */
  generateBottomUpTestEntity() {
    return {
      type: 'bottom-up',
      repository: chance.url(),
      creator: {
        id: chance.guid(),
        displayName: chance.name(),
      },
      purpose: chance.sentence(),
      includeDev: true,
    };
  }

  /**
   * @param {TestModel} model
   * @param {number=} sample
   * @return {Promise<string[]>}
   */
  async populateTests(model, sample=25) {
    const transaction = model.store.transaction();
    await transaction.run();
    const keys = [];
    Array(sample).fill(0).forEach(() => {
      const key = model.createTestKey(chance.guid());
      const info = this.generateAmfTestEntity();
      // @ts-ignore
      info.created = Date.now();
      const entity = {
        key,
        data: info,
      };
      transaction.save(entity);
      keys.push(key.name);
    });
    await transaction.commit();
    return keys;
  }

  /**
   * @return {PassportProfile}
   */
  generatePassportProfile() {
    return {
      provider: 'google',
      id: chance.word(),
      displayName: chance.name(),
      emails: [{ value: chance.email() }],
      photos: [{ value: chance.url() }],
    };
  }

  /**
   * @return {UserEntity}
   */
  generateUserEntity() {
    return {
      id: chance.guid(),
      displayName: chance.name(),
      orgUser: true,
      imageUrl: chance.url(),
      tos: false,
      email: chance.email({
        domain: 'mulesoft.com',
      }),
    };
  }

  /**
   * Generates a new JWT.
   * @param {UserEntity} user Session user object
   * @param {TokenCreateInfo} createInfo Create options
   * @return {string} Generated token.
   */
  generateToken(user, createInfo) {
    const data = {
      uid: user.id,
      scopes: createInfo.scopes,
    };
    const opts = {
      issuer: tokenIssuer,
    };
    if (createInfo.expires) {
      opts.expiresIn = createInfo.expires;
    }
    return jwt.sign(data, SECRET, opts);
  }

  /**
   * Synchronously validates the token
   * @param {string} token User token.
   * @return {TokenInfo} Token info object.
   */
  verifyToken(token) {
    return /** @type TokenInfo */ (jwt.verify(token, SECRET));
  }

  /**
   * @param {TokenModel} model
   * @param {UserEntity} user
   * @param {number=} sample
   * @return {Promise<string[]>}
   */
  async populateTokens(model, user, sample=25) {
    const transaction = model.store.transaction();
    await transaction.run();
    const keys = [];
    Array(sample).fill(0).forEach(() => {
      const key = model.createUserTokenKey(user.id, chance.guid());
      const scopes = [chance.word()];
      const token = this.generateToken(user, {
        scopes,
        expires: chance.integer({ min: 0 }),
      });
      const tokenInfo = this.verifyToken(token);
      const entity = {
        key,
        data: {
          token,
          scopes,
          issuer: {
            id: user.id,
            displayName: user.displayName,
          },
          created: Date.now(),
          expires: tokenInfo.exp,
          name: chance.word(),
        },
      };
      transaction.save(entity);
      keys.push(key.name);
    });
    await transaction.commit();
    return keys;
  }
}

const instance = new DataHelper();
export default instance;
