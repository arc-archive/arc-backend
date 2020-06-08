import { BaseModel, Entity, QueryResult, QueryOptions } from './BaseModel.js';
import { PassportProfile, Email } from './PassportProfile';

export declare interface UserEntity extends Entity {
  /**
   * User's display name as received from the OAuth provider
   */
  displayName: string;
  /**
   * Whether or not the user is allowed organizations user.
   */
  orgUser: boolean;
  /**
   * User image URL as received from the OAuth provider
   */
  imageUrl?: string;
  /**
   * Whether the user accepted terms of service
   */
  tos: boolean;
  /**
   * OAuth refresh token, if received.
   */
  refreshToken?: string;
  /**
   * The email used with the registration.
   * Might be not set for entries created in the previous version of the system.
   */
  email?: string;
}

export declare interface UserQueryResult extends QueryResult<UserEntity> {}

export declare interface UserQueryOptions extends QueryOptions {}

/**
 * Model representing an User in the system.
 */
export class UserModel extends BaseModel {
  constructor();

  /**
   * Model properties excluded from indexes
   */
  readonly excludedIndexes: string[];

  /**
   * Allowed registration domain.
   */
  readonly orgDomains: string[];

  /**
   * Lookups and returns user object.
   * @param id User ID.
   * @returns User object or undefined if not found.
   */
  get(id: string): Promise<UserEntity|null>;

  /**
   * Checks emails returned from the response to determine whether the user
   * is organization user and therefore has create rights.
   *
   * @param emails List of emails received from the OAuth response.
   * @returns Whether the user is allowed organization user
   */
  _processUserPermissions(emails: Email[]): boolean;

  _extractEmail(emails: Email[]): string|null;

  /**
   * Extracts profile information from OAuth2 response.
   * @param profile Profile data returned by Passport.
   * @returns User model
   */
  extractOauthProfile(profile: PassportProfile): UserEntity;

  /**
   * Creates a user.
   * @param profile Response from OAuth authentication from Passport.
   * @param refreshToken OAuth refresh token. Not required.
   * @returns A promise resolved to user id.
   */
  createUser(profile: PassportProfile, refreshToken?: string): Promise<String>;

  /**
   * Returns a user if already exists or creates new user and returns new profile.
   * @param profile Response from OAuth authentication from Passport.
   * @param refreshToken OAuth refresh token. Not required.
   * @returns Promise resolved to user profile info.
   */
  findOrCreateUser(profile: PassportProfile, refreshToken?: string): Promise<UserEntity>;
}
