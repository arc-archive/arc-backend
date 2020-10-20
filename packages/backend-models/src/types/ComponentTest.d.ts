import { Creator } from './Creator';
import { BaseModel, Entity, QueryResult, QueryOptions } from '../BaseModel';

/**
 * A definition of a base type of a test run of the APIC & ARC components.
 */
export declare interface BaseTest {
  /**
   * The type of the build. The value of this field determines 
   * the definition of this object
   */
  type: 'bottom-up' | 'amf';
  /**
   * The status of the test run. Defaults to `queued`.
   * @readonly This is ignored when creating / updating an entity
   */
  status?: 'queued' | 'running' | 'finished';
  /**
   * The number of components being tested in this run.
   * @readonly This is ignored when creating / updating an entity
   */
  size?: number;
  /**
   * The number of components that passed the test run
   * @readonly This is ignored when creating / updating an entity
   */
  passed?: number;
  /**
   * The number of components that failed the test run
   * @readonly This is ignored when creating / updating an entity
   */
  failed?: number;
  /**
   * A flag determining that the test resulted with an error
   * @readonly This is ignored when creating / updating an entity
   */
  error?: boolean;
  /**
   * A message associated with the test.
   * @readonly This is ignored when creating / updating an entity
   */
  message?: string;
  /**
   * Timestamp when the entry was created.
   * @readonly This is ignored when creating / updating an entity
   */
  created?: number;
  /**
   * Timestamp when the build started
   * @readonly This is ignored when creating / updating an entity
   */
  started?: number;
  /**
   * Timestamp when the build finished
   * @readonly This is ignored when creating / updating an entity
   */
  ended?: number;
  /**
   * The definition of the creator of the test run.
   * @readonly This is ignored when creating / updating an entity
   */
  creator?: Creator;
  /**
   * The message to render in the UI as a purpose of this test.
   */
  purpose?: string;
}

/**
 * A definition of a test run for the AMF build.
 */
export declare interface AmfTest extends BaseTest {
  /**
   * The type of the build. The value of this field determines 
   * the definition of this object
   */
  type: 'amf';
  /**
   * The source branch of the AMF to use to build the AMF library from.
   */
  amfBranch: string;
}

/**
 * Data store version of the AmfTest
 */
export declare interface AmfTestEntity extends AmfTest, Entity {}

/**
 * A definition of a test run for the component dependencies.
 * This kind of tests ensures that other components that depends on the given component are 
 * compatible.
 */
export declare interface BottomUpTest extends BaseTest {
  /**
   * The type of the build. The value of this field determines 
   * the definition of this object
   */
  type: 'bottom-up';
  /**
   * The ssh or http uri to the repository
   */
  repository: string;
  /**
   * Whether or not to include dev dependencies in the test.
   */
  includeDev?: boolean;
}

/**
 * Data store version of the BottomUpTest
 */
export declare interface BottomUpTestEntity extends BottomUpTest, Entity {}

export declare interface TestQueryResult extends QueryResult<BottomUpTestEntity|AmfTestEntity> {}

export declare interface TestQueryOptions extends QueryOptions {}