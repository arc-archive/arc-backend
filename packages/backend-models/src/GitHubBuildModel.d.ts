import { BaseModel } from './BaseModel.js';
import { GithubBuildQueryOptions, GithubBuildQueryResult, GithubBuild, GithubBuildEntity } from './types/GitHubBuild';

/**
 * A list of properties to exclude from indexing.
 */
declare const excludedIndexes: string[];

/**
 * A data store entry representing a CI build of a project in any connected organization.
 *
 * Each build is related to a part of the CI process:
 *
 * - Stage build (type)
 *  - bump version (if previous version is the same)
 *  - update changelog file
 *  - merge with master
 *  - push master & stage
 * - Master build:
 *   - tag GitHub release
 *   - build release changelog
 *   - push to GitHub
 * - Tag build:
 *   - release NPM package
 *   - add a new version of the component
 *   - add auto docs to the data store
 *   - add the dependency information.
 */
export class GitHubBuildModel extends BaseModel {
  constructor();
  /**
   * Lists test runs
   * @param opts Query options
   * @returns Query results.
   */
  list(opts?: GithubBuildQueryOptions): Promise<GithubBuildQueryResult>;

  /**
   * Creates a new build.
   * @param info Build definition.
   * @returns The created build
   */
  insertBuild(info: GithubBuild): Promise<GithubBuildEntity>;

  /**
   * Reads the build info
   * @param id The ID of the build
   */
  get(id: string): Promise<GithubBuildEntity>;

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
   * It uses a transaction to update values.
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
