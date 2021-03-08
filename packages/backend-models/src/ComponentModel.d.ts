import { BaseModel, Entity, QueryResult, QueryOptions } from './BaseModel.js';
import {entity} from '@google-cloud/datastore/build/src/entity';

export interface ComponentEntity extends Entity {
  /**
   * The GitHub name of the component's repository.
   */
  name: string;
  /**
   * GitHub's organization name the component is in.
   * With combination with the `name` it creates GitHub's URI.
   */
  org: string;
  /**
   * The component's package name (scope + name)
   */
  npmName: string;
  /**
   * The latest version of the component. This is the last highest release.
   */
  version: string;
  /**
   * The list of version names of the component.
   */
  versions: string[];
  /**
   * A list of tags associated with the component. For the internal use of the CI.
   */
  tags?: string[];
}

export interface VersionEntity extends Entity {
  /**
   * The component's package name (scope + name)
   */
  npmName: string;
  /**
   * The timestamp when the component was created.
   */
  created: number;
  /**
   * A list of tags associated with the component. For the internal use of the CI.
   */
  tags?: string[];
  /**
   * The version name of the component.
   */
  version: string;
}

export declare interface ComponentQueryResult extends QueryResult<ComponentEntity> {}
export declare interface VersionQueryResult extends QueryResult<VersionEntity> {}

export declare interface ComponentQueryOptions extends QueryOptions {}

export declare interface ComponentFilterOptions extends QueryOptions {
  /**
   * List of tags to filter the components for.
   */
  tags?: string[];
}

export declare interface VersionQueryOptions extends QueryOptions {
  /**
   * The component's package name (scope + name)
   */
  npmName?: string;
  /**
   * A list of tags associated with the component. For the internal use of the CI.
   */
  tags?: string[];
  since?: number;
  until?: number;
}

export declare interface VersionCreateOptions {
  /**
   * Component version
   */
  version: string;
  /**
   * Component name (NPM scope + name)
   */
  npmName: string;
  /**
   * The GitHub name of the component's repository.
   */
  name: string;
   /**
    * GitHub's organization name the component is in.
    * With combination with the `name` it creates GitHub's URI.
    */
  org: string;
}

export declare interface TagsProcessOptions {
  /**
   * When set it does not affect existing tags when `tags` is not defined
   */
  keepTags?: boolean;
  /**
   * List of tags to add to the entity
   */
  tags?: string[];
}

/**
 * A model for catalog items.
 */
export declare class ComponentModel extends BaseModel {
  /**
   * Component model excluded indexes
   */
  get componentExcludeIndexes(): string[];
  /**
   * Version model excluded indexes
   */
  get versionExcludeIndexes(): string[];
  constructor();

  /**
   * @param npmName The component's NPM name.
   * @returns A key for a component
   */
  createComponentKey(npmName: string): entity.Key;

  /**
   * Creates datastore key for version object
   * @param npmName The component's NPM name.
   * @param version Component version
   */
  createVersionKey(npmName: string, version: string): entity.Key;

  /**
   * Finds largest non-pre-release version in the list of versions.
   * @param range List of semver versions.
   * @returns Largest version in the list.
   */
  findLatestVersion(range: string[]): string;

  /**
   * Creates an expanded entity definition for data communication.
   *
   * @param item Datastore entity for a component.
   * @returns Final version of the entity.
   */
  _fromComponentDatastore(item: object): ComponentEntity;

  /**
   * Lists components.
   *
   * @param opts Query options
   * @returns Promise resolved to a list of components.
   */
  listComponents(opts?: ComponentQueryOptions): Promise<ComponentQueryResult>;

  /**
   * Lists components.
   *
   * @param opts Query options
   * @returns Promise resolved to a list of components.
   */
  queryComponents(opts?: ComponentFilterOptions): Promise<ComponentQueryResult>;

  /**
   * Lists names of API components (with `apic` tag)
   * @returns Promise resolved to a list of names.
   */
  listApiComponents(): Promise<ComponentEntity[]>;

  /**
   * Lists names of AMF consuming components (with `amf` tag)
   * @returns Promise resolved to a list of names.
   */
  listAmfComponents(): Promise<ComponentEntity[]>;

  /**
   * Lists names of components that has a tag.
   * @param tag The tag to search for.
   * @returns Promise resolved to a list of names.
   */
  listTagComponents(tag: string): Promise<ComponentEntity[]>;

  /**
   * Creates an expanded entity definition for data communication.
   *
   * @param object item Datastore entity for a version.
   * @returns Final version of the entity.
   */
  _fromVersionDatastore(item: object): VersionEntity;

  /**
   * Lists version of a component.
   * @param nameName The component's package name (scope + name)
   * @param  Query options
   */
  listVersions(nameName: string, opts?: VersionQueryOptions): Promise<VersionQueryResult>;

  /**
   * Creates a new version of API component in the data store.
   *
   * @param info Version description
   */
  addVersion(info: VersionCreateOptions): Promise<void>;

  /**
   * Returns component definition.
   * @param npmName The component's package name (scope + name)
   */
  getComponent(npmName: string): Promise<ComponentEntity>;

  /**
   * Creates a component.
   *
   * @param name The GitHub name of the component's repository.
   * @param org GitHub's organization name the component is in.
   * With the combination with the `name` it creates GitHub's URI.
   * @param npmName The component's package name (scope + name)
   * @param version Component version
   * @param key Key of the entity.
   * @param tags Tags processing options
   * @returns Generated model.
   */
  createComponent(name: string, org: string, npmName: string, version: string, key: entity.Key, tags?: TagsProcessOptions): Promise<ComponentEntity>;

  /**
   * Test if component data are already stored and creates a model if not.
   *
   * @param version Component version
   * @param name The GitHub name of the component's repository.
   * @param org GitHub's organization name the component is in.
   * With combination with the `name` it creates GitHub's URI.
   * @param npmName The component's package name (scope + name)
   * @param tags Tags processing options
   */
   ensureComponent(version: string, name: string, org: string, npmName: string, tags?: TagsProcessOptions): Promise<ComponentEntity>;

  /**
   * Adds a new version to the component model.
   * @param model Existing model
   * @param version Version number
   * @param key Datastore key
   * @param tagOpts Tags processing options
   * @returns updated model
   */
  addComponentVersion(model: ComponentEntity, version: string, key: entity.Key, tagOpts?: TagsProcessOptions): Promise<ComponentEntity>;

  /**
   * Replaces/creates version in the data store
   *
   * @param parent Parent component
   * @param version Component version
   * @param npmName The component's package name (scope + name)
   */
  ensureVersion(parent: ComponentEntity, version: string, npmName: string): Promise<void>;

  /**
   * Creates component version entity.
   *
   * @param parent Parent component
   * @param version Component version
   * @param npmName The component's package name (scope + name)
   */
  createVersion(parent: ComponentEntity, version: string, npmName: string): Promise<void>;

  /**
   * Returns component definition.
   * @param npmName The component's package name (scope + name)
   * @param version Version name.
   */
  getVersion(npmName: string, version: string): Promise<VersionEntity|null>;

  /**
   * Queries for versions.
   * @param opts Query options
   */
  queryVersions(opts?: VersionQueryOptions): Promise<VersionQueryResult>;

  /**
   * Updates properties of a component entity
   * @param npmName The component's package name (scope + name)
   * @param props Properties to update
   */
  updateComponentProperties(npmName: string, props: object): Promise<void>;
}
