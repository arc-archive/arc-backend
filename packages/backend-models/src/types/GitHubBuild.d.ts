import { BaseModel, Entity, QueryResult, QueryOptions } from '../BaseModel.js';

export declare interface GithubBuild {
  /**
   * The ssh or http uri to the repository
   */
  repository: string;
  /**
   * The type of the build
   */
  type: 'stage' | 'master' | 'tag';
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
   * A flag determining that the build resulted with an error
   * @readonly This is ignored when creating / updating an entity
   */
  error?: boolean;
  /**
   * A message associated with the build.
   * @readonly This is ignored when creating / updating an entity
   */
  message?: string;
  /**
   * The status of the build. Defaults to `queued`.
   * @readonly This is ignored when creating / updating an entity
   */
  status?: 'queued' | 'running' | 'finished';
}

export declare interface GithubBuildEntity extends GithubBuild, Entity {
  
}

export declare interface GithubBuildQueryOptions extends QueryOptions {}
export declare interface GithubBuildQueryResult extends QueryResult<GithubBuildEntity> {}