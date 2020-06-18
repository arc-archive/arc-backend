import { BaseModel, Entity, QueryResult, QueryOptions } from './BaseModel.js';

export declare interface EditableComponentBuildEntity {
  /**
   * Component's branch. Default to "master".
   */
  branch: string;
  /**
   * The name of the component
   */
  component: string;
  /**
   * GitHub organization of the component.
   */
  org: string;
  /**
   * The type of the build
   */
  type: string;
  /**
   * The commit SHA
   */
  commit: string;
  /**
   * SSH URL of the repository
   */
  sshUrl: string;
  /**
   * Whether or not version should be bumped when nurrning the build.
   */
  bumpVersion?: boolean;
  /**
   * Timestamp when the build started
   */
  startTime?: number;
  /**
   * Timestamp when the build finished
   */
  endTime?: number;
  /**
   * A flag determining that the test resulted with an error
   */
  error?: boolean;
  /**
   * An error message.
   */
  message?: string;
  /**
   * The staus of the build. Defaults to `queued`.
   */
  status?: string;
}

export declare interface ComponentBuildEntity extends EditableComponentBuildEntity, Entity {
  /**
   * Timestamp of when the object was created.
   */
  created: number;
  /**
   * Current status of the build
   */
  status: string;
}

export declare interface ComponentBuildQueryOptions extends QueryOptions {}
export declare interface ComponentBuildQueryResult extends QueryResult<ComponentBuildEntity> {}

/**
 * A model for catalog items.
 */
export class ComponentBuildModel extends BaseModel {
  constructor();

  /**
   * Lists test runs
   * @param opts Query options
   * @returns Query results.
   */
  list(opts?: ComponentBuildQueryOptions): Promise<ComponentBuildQueryResult>;

  /**
   * Creates a new build.
   * @param info Build definition.
   * @returns The created build
   */
  insertBuild(info: EditableComponentBuildEntity): Promise<ComponentBuildEntity>;

  /**
   * Reads the build info
   * @param id The ID of the build
   */
  get(id: string): Promise<ComponentBuildEntity>;

  /**
   * Updates the build to set status to running.
   * @param id The ID of the build
   */
  startBuild(id: string): Promise<void>;

  /**
   * Resets the build data
   * @param {string} id The ID of the build
   */
  restartBuild(id: string): Promise<void>;

  /**
   * Updates the build to set error.
   * @param {string} id The ID of the build
   * @param {string} message Error message to set
   */
  setBuildError(id: string, message: string): Promise<void>;

  /**
   * Updates the build to set finished state
   * @param {string} id The ID of the build
   * @param {string=} message Additional message to set.
   */
  finishBuild(id: string, message?: string): Promise<void>;

  /**
   * Updates build properties in the data store.
   * It uses a transation to update values.
   *
   * @param {string} id The ID of the build
   * @param {object} props Properties to update
   */
  updateBuildProperties(id: string, props: object): Promise<void>;

  /**
   * Deletes a build run.
   * @param id The ID of the build
   */
  delete(id: string): Promise<void>;
}
