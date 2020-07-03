import { BaseModel, Entity } from './BaseModel.js';
import {entity} from '@google-cloud/datastore/build/src/entity';

export declare interface DependencyEntry {
  /**
   * Github organization of the package
   */
  org: string;
  /**
   * Github repository name
   */
  name: string;
  /**
   * The full name of the package (scope + name)
   */
  pkg: string;
  /**
   * List of package names that are dependencies of this package.
   */
  dependencies?: string[];
  /**
   * List of package names that are development dependencies of this package.
   */
  devDependencies?: string[];
}

export declare interface DependencyEntity extends DependencyEntry, Entity {
  /**
   * Added to a dependency model to mark it as this is a dev dependency of another dependency.
   */
  development?: boolean;
  /**
   * Added to the quesy result, marks items that are production depenmdencies
   */
  production?: boolean;
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
   * @param entry The entry to insert
   * @returns The id of the created entity
   */
  set(entry: DependencyEntry): Promise<string>;

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
  get(component: string): Promise<DependencyEntity|null>;
}
