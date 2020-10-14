import { Datastore } from '@google-cloud/datastore';
import decamelize from 'decamelize';
import slug from 'slug';
import config from '@advanced-rest-client/backend-config';

/** @typedef {import('@google-cloud/datastore/build/src/entity').entity.Key} Key */

/* eslint class-methods-use-this: 'off' */

/**
 * A base model for all datastore model classes.
 */
export class BaseModel {
  /**
   * @param {string} namespace Datastore namespace to use with datastore requests.
   */
  constructor(namespace) {
    this.namespace = namespace;
    this.store = new Datastore({
      projectId: config.get('GCLOUD_PROJECT'),
      namespace: this.namespace,
    });
    this.listLimit = 25;
  }

  /**
   * @return {string} A symbol representing no more results in the data store
   */
  get NO_MORE_RESULTS() {
    return Datastore.NO_MORE_RESULTS;
  }

  /**
   * @return {string} The kind value for tests
   */
  get testKind() {
    return 'Test';
  }

  /**
   * @return {string} The kind value for components
   */
  get componentsKind() {
    return 'Component';
  }

  /**
   * @return {string} The kind value for versions
   */
  get versionsKind() {
    return 'Version';
  }

  /**
   * @return {string} The kind value for groups
   */
  get groupsKind() {
    return 'Group';
  }

  /**
   * @return {string} The kind value for groups
   */
  get organizationKind() {
    return 'Organization';
  }

  /**
   * @return {string} The kind value for test logs
   */
  get testLogsKind() {
    return 'TestComponentLogs';
  }

  /**
   * @return {string} The kind value for users
   */
  get userKind() {
    return 'User';
  }

  /**
   * @return {string} The kind value for JWT tokens
   */
  get tokenKind() {
    return 'Jwt';
  }

  /**
   * @return {string} The kind value for builds
   */
  get buildKind() {
    return 'Build';
  }

  /**
   * @return {string} The kind value for messages (ARC messages)
   */
  get messageKind() {
    return 'Messages';
  }

  /**
   * @return {string} The kind value for dependencies
   */
  get dependencyKind() {
    return 'Dependency';
  }

  /**
   * @return {string} The kind value for coverage run
   */
  get coverageRunKind() {
    return 'CoverageTest';
  }

  /**
   * @return {string} The kind value for coverage run
   */
  get coverageComponentKind() {
    return 'ComponentVersionCoverageResult';
  }

  /**
   * @return {string} The namespace value for users
   */
  get apicUsersNamespace() {
    return 'api-components-users';
  }

  /**
   * @return {string} The namespace value for tests
   */
  get apicTestsNamespace() {
    return 'api-components-tests';
  }

  /**
   * @return {string} The namespace value for builds
   */
  get buildsNamespace() {
    return 'apic-github-builds';
  }

  /**
   * @return {string} The namespace value for coverage
   */
  get coverageNamespace() {
    return 'api-components-coverage';
  }

  /**
   * Creates a slug from a string.
   *
   * @param {string} name Value to slug,
   * @return {string}
   */
  slug(name) {
    return slug(decamelize(name, '-'));
  }

  /**
   * Translates from a datastore entity format to
   * the format expected by the application.
   *
   * Datastore format:
   *    {
   *      key: [kind, id],
   *      data: {
   *        property: value
   *      }
   *    }
   *
   *  Application format:
   *    {
   *      id: id,
   *      property: value
   *    }
   * @param {object} obj Datastore entry
   * @return {object}
   */
  fromDatastore(obj) {
    const key = obj[this.store.KEY];
    obj.id = key.name || key.id;
    return obj;
  }

  /**
   * Creates a datastore key for a test.
   * @param {string} testId Test id
   * @return {Key} Datastore key
   */
  createTestKey(testId) {
    return this.store.key({
      namespace: this.namespace,
      path: [this.testKind, testId],
    });
  }

  /**
   * Creates a datastore key for a coverage test run
   * @param {string} runId Test id
   * @return {Key} Datastore key
   */
  createCoverageRunKey(runId) {
    return this.store.key({
      namespace: this.coverageNamespace,
      path: [this.coverageRunKind, runId],
    });
  }

  /**
   * Creates a datastore key for a component in a test.
   * @param {string} testId Test id
   * @param {string} componentName Component name
   * @return {Key} Datastore key
   */
  createTestComponentKey(testId, componentName) {
    return this.store.key({
      namespace: this.namespace,
      path: [this.testKind, testId, this.componentsKind, this.slug(componentName)],
    });
  }

  /**
   * Creates a key for test logs
   *
   * @param {string} testId Test id
   * @param {string} componentName Component name
   * @param {string} id The id of the log
   * @return {Key} Datastore key
   */
  createTestLogKey(testId, componentName, id) {
    return this.store.key({
      namespace: this.namespace,
      path: [this.testKind, testId, this.componentsKind, this.slug(componentName), this.testLogsKind, id],
    });
  }

  /**
   * Creates a datastore key for a build.
   * @param {string} id Build id
   * @return {Key} Datastore key
   */
  createBuildKey(id) {
    return this.store.key({
      namespace: this.buildsNamespace,
      path: [this.buildKind, id],
    });
  }

  /**
   * Creates an key for a coverage result entry for a file
   * @param {string} component The name of the component
   * @param {string} org Component's organization
   * @param {string} version Version of the component
   * @param {string} file Covered file name
   * @return {Key}
   */
  createComponentVersionFileCoverageKey(component, org, version, file) {
    return this.store.key({
      namespace: this.coverageNamespace,
      path: [
        this.organizationKind, this.slug(org),
        this.componentsKind, this.slug(component),
        this.versionsKind, version,
        this.coverageComponentKind, file,
      ],
    });
  }

  /**
   * Creates an key for a coverage result entry for a file
   * @param {string} component The name of the component
   * @param {string} org Component's organization
   * @param {string} version Version of the component
   * @return {Key}
   */
  createComponentVersionCoverageKey(component, org, version) {
    return this.store.key({
      namespace: this.coverageNamespace,
      path: [
        this.organizationKind, this.slug(org),
        this.componentsKind, this.slug(component),
        this.versionsKind, version,
      ],
    });
  }

  /**
   * Creates an key for a coverage result entry for a file
   * @param {string} component The name of the component
   * @param {string} org Component's organization
   * @return {Key}
   */
  createComponentCoverageKey(component, org) {
    return this.store.key({
      namespace: this.coverageNamespace,
      path: [
        this.organizationKind, this.slug(org),
        this.componentsKind, this.slug(component),
      ],
    });
  }

  /**
   * Creates a datastore key for a user.
   * @param {string} id OAuth returned user ID.
   * @return {Key} Datastore key
   */
  createUserKey(id) {
    return this.store.key({
      namespace: this.apicUsersNamespace,
      path: [this.userKind, id],
    });
  }

  /**
   * Creates a datastore key for a user's token.
   * @param {string} userId User ID.
   * @param {string} tokenId Token id.
   * @return {Key} Datastore key
   */
  createUserTokenKey(userId, tokenId) {
    return this.store.key({
      namespace: this.apicUsersNamespace,
      path: [this.userKind, userId, this.tokenKind, tokenId],
    });
  }
}
