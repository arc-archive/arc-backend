import { BaseModel, Entity } from './BaseModel.js';
import {entity} from '@google-cloud/datastore/build/src/entity';

export declare interface DependencyEntity extends Entity {
  org: string;
  pkg: string;
  dependencies?: string[];
  devDependencies?: string[];
  /**
   * Added to a dependency model to mark it as this is a dev dependency of another dependency.
   */
  development?: boolean;
}

/**
 * A model for catalog items.
 */
export class DependencyModel extends BaseModel {
  constructor();

  /**
   * Creates a data store key
   */
  _createKey(name: string): entity.Key;

  /**
   * @returns Model properties excluded from indexes
   */
  readonly excludeFromIndexes: string[];

  /**
   * Adds new dependency
   * @param {string} component Component name
   * @param {string[]} dependencies List of dependencies (package names)
   * @param {string[]} devDependencies List of dev dependencies (package names)
   * @param {string} org Component GitHub organization
   * @param {string} pkg Component package name
   * @return {Promise<void>} [description]
   */
  set(component: string, dependencies: string[], devDependencies: string[], org: string, pkg:string): Promise<void>

  /**
   * Lists dependncies that would be a parent for a component.
   * @param dependency The component name
   * @param includeDev Whether or not to include dev dependencies in the query
   */
  listParentComponents(dependency: string, includeDev?: boolean): Promise<DependencyEntity[]>;

  /**
   * Lists dev dependncies that would be a parent for a component.
   * @param dependency The component name
   */
  listDevParentComponents(dependency: string): Promise<DependencyEntity[]>;

  /**
   * Reads a dependency data from the store
   * @param component Component name.
   */
  get(component: string): Promise<DependencyEntity>;
}
