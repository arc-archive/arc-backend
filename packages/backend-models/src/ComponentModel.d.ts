import { BaseModel, Entity, QueryResult, QueryOptions } from './BaseModel.js';
import {entity} from '@google-cloud/datastore/build/src/entity';

export interface GroupEntity extends Entity {
  name: string;
}

export interface ComponentEntity extends Entity {
  name: string;
  version: string;
  versions: string[];
  group: string;
  pkg: string;
  org: string;
  groupId: string;
  tags?: string[];
}

export interface VersionEntity extends Entity {
  name: string;
  docs: string;
  created: number;
  tags?: string[];
  changelog?: string;
}

export declare interface GroupQueryResult extends QueryResult<GroupEntity> {}
export declare interface ComponentQueryResult extends QueryResult<ComponentEntity> {}
export declare interface VersionQueryResult extends QueryResult<VersionEntity> {}

export declare interface GroupQueryOptions extends QueryOptions {}
export declare interface ComponentQueryOptions extends QueryOptions {
  group?: string;
}

export declare interface ComponentFilterOptions extends QueryOptions {
  /**
   * Group name, when set it limits results to a specific group
   */
  group?: string;
  /**
   * List of tags to filter the components for.
   */
  tags?: string[];
}

export declare interface VersionQueryOptions extends QueryOptions {
  component?: string;
  group?: string;
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
   * Component name
   */
  component: string;
  /**
   * Component group
   */
  group: string;
  /**
   * Component package name
   */
  pkg: string;
  /**
   * Component GitHub organization name
   */
  org: string;
  /**
   * Documentation data.
   */
  docs: string;
  /**
   * Changelog string to store with version
   */
  changeLog: string;
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
  readonly componentExcludeIndexes: string[];
  /**
   * Version model excluded indexes
   */
  readonly versionExcludeIndexes: string[];
  constructor();

  /**
   * @param name Group name
   * @returns A key for a group
   */
  createGroupKey(name: string): entity.Key;

  /**
   * @param groupName Group name
   * @param componentName Component name
   * @returns A key for a component
   */
  createComponentKey(groupName: string, componentName: string): entity.Key;

  /**
   * Creates datastore key for version object
   * @param groupName Component's group
   * @param componentName Component name
   * @param version Component version
   */
  createVersionKey(groupName: string, componentName: string, version: string): entity.Key;

  /**
   * Finds largest non-pre-release version in the list of versions.
   * @param range List of semver versions.
   * @returns Largest version in the list.
   */
  findLatestVersion(range: string[]): string;

  /**
   * Lists groups.
   *
   * @param opts Query options
   * @returns Promise resolved to a list of components.
   */
  listGroups(opts?: GroupQueryOptions): Promise<GroupQueryResult>;

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
   * @param group Component group id
   * @param component Component id
   * @param  Query options
   */
  listVersions(group: string, component: string, opts?: VersionQueryOptions): Promise<VersionQueryResult>;

  /**
   * Creates a new version of API component in the data store.
   *
   * @param info Version description
   */
  addVersion(info: VersionCreateOptions): Promise<void>;
  /**
   * Creates a group of components if it does not exist.
   *
   * @param groupName Name of the group
   */
  ensureGroup(groupName: string): Promise<GroupEntity>;

  /**
   * Returns group model.
   * @param name Group name
   */
  getGroup(name: string): Promise<GroupEntity>;

  /**
   * Creates a component group entity.
   *
   * @param name Name of the group
   * @param key Key of the entity.
   * @returns Generated model.
   */
  createGroup(name: string, key: entity.Key): Promise<GroupEntity>;

  /**
   * Test if component data are already stored and creates a model if not.
   *
   * @param version Component version
   * @param componentName Component name
   * @param groupName Component's group
   * @param pkg Component package name
   * @param org Component organization
   * @param tags Tags processing options
   */
  ensureComponent(version: string, componentName: string, groupName: string, pkg: string, org: string, tags?: TagsProcessOptions): Promise<ComponentEntity>;

  /**
   * Returns component definition.
   * @param groupName Group id
   * @param componentName Component id
   */
  getComponent(groupName: string, componentName: string): Promise<ComponentEntity>;

  /**
   * Creates a component.
   *
   * @param name Name of the group
   * @param version Component version
   * @param groupName Component's group
   * @param pkg Component package name
   * @param org Component organization
   * @param key Key of the entity.
   * @param tags Tags processing options
   * @returns Generated model.
   */
  createComponent(name: string, version: string, groupName: string, pkg: string, org: string, key: entity.Key, tags?: TagsProcessOptions): Promise<ComponentEntity>;

  /**
   * Adds a new version to the component model.
   * @param model Existing model
   * @param version Version number
   * @param key Datastore key
   * @param tags Tags processing options
   * @returns updated model
   */
  addComponentVersion(model: ComponentEntity, version: string, key: entity.Key, tags?: TagsProcessOptions): Promise<ComponentEntity>;

  /**
   * Replaces/creates version in the data store
   *
   * @param {ComponentEntity} parent Parent component
   * @param version Component version
   * @param componentName Component name
   * @param groupName Component's group
   * @param {object} data Polymer analysis result
   * @param {String=} changelog Version changelog
   * @return {Promise<void>}
   */
  ensureVersion(parent: ComponentEntity, version: string, componentName: string, groupName: string, data: object, changelog?: string): Promise<void>;

  /**
   * Creates component version entity.
   *
   * @param parent Parent component
   * @param version Component version
   * @param componentName Component name
   * @param groupName Component's group
   * @param docs Polymer analysis result
   * @param changelog Generated changelog
   */
  createVersion(parent: ComponentEntity, version: string, componentName: string, groupName: string, docs: object, changelog?: string): Promise<void>;

  /**
   * Returns component definition.
   * @param groupName Group name
   * @param componentName Component name
   * @param version Version name.
   */
  getVersion(groupName: string, componentName: string, version: string): Promise<VersionEntity|null>;

  /**
   * Queries for versions.
   * @param opts Query options
   */
  queryVersions(opts?: VersionQueryOptions): Promise<VersionQueryResult>;

  /**
   * Updates properties of a component entity
   * @param groupName Name of component's group
   * @param componentName Name of the component
   * @param props Properties to update
   */
  updateComponentProperties(groupName: string, componentName: string, props: object): Promise<void>;
}
