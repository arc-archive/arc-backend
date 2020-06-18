import { BaseModel } from './BaseModel.js';

/** @typedef {import('@google-cloud/datastore/build/src/entity').entity.Key} Key */
/** @typedef {import('./PassportProfile').PassportProfile} PassportProfile */
/** @typedef {import('./PassportProfile').Email} Email */
/** @typedef {import('./UserModel').UserEntity} UserEntity */

const externalEmails = ['jarrodek@gmail.com'];

/**
 * Model representing an User in the system.
 */
export class UserModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components-users');
  }

  /**
   * @return {string[]} Model properties excluded from indexes
   */
  get excludedIndexes() {
    return ['displayName', 'orgUser', 'superUser', 'imageUrl', 'email'];
  }

  /**
   * @return {string[]} Allowed registration domain.
   */
  get orgDomains() {
    return ['@mulesoft.com', '@salesforce.com'];
  }

  /**
   * Lookups and returns user object.
   * @param {string} id User ID.
   * @return {Promise<UserEntity|null>} User object or undefined if not found.
   */
  async get(id) {
    const key = this.createUserKey(id);
    try {
      const [entity] = await this.store.get(key);
      if (entity) {
        return this.fromDatastore(entity);
      }
    } catch (e) {
      //
    }
    return null;
  }

  /**
   * Checks emails returned from the response to determine whether the user
   * is organization user and therefore has create rights.
   *
   * @param {Email[]} emails List of emails received from the OAuth response.
   * @return {boolean} Whether the user is allowed organization user
   */
  _processUserPermissions(emails) {
    if (!Array.isArray(emails)) {
      return false;
    }
    let orgUser = false;
    const domains = this.orgDomains;
    for (let i = 0; i < emails.length; i++) {
      if (orgUser) {
        break;
      }
      const info = emails[i];
      if (!info || !info.value) {
        continue;
      }
      if (externalEmails.indexOf(info.value) !== -1) {
        orgUser = true;
        break;
      }
      for (let j = 0, jLen = domains.length; j < jLen; j++) {
        if (info.value.indexOf(domains[j]) !== -1) {
          orgUser = true;
          break;
        }
      }
    }
    return orgUser;
  }

  /**
   * Extracts user email for the profile from the profile emails received from oauth
   * @param {Email[]} emails [description]
   * @return {string|null} [description]
   */
  _extractEmail(emails) {
    if (!Array.isArray(emails)) {
      return null;
    }
    const domains = this.orgDomains;
    let email;
    for (let i = 0; i < emails.length; i++) {
      const info = emails[i];
      if (!info || !info.value) {
        continue;
      }
      email = String(info.value);
      if (externalEmails.indexOf(email) !== -1) {
        return email;
      }
      for (let j = 0, jLen = domains.length; j < jLen; j++) {
        if (info.value.indexOf(domains[j]) !== -1) {
          return email;
        }
      }
    }
    return email || null;
  }

  /**
   * Extracts profile information from OAuth2 response.
   * @param {PassportProfile} profile Profile data returned by Passport.
   * @return {UserEntity} User model
   */
  extractOauthProfile(profile) {
    const emails = profile.emails || [];
    const orgUser = this._processUserPermissions(emails);
    const email = this._extractEmail(emails);
    let imageUrl = '';
    if (profile.photos && profile.photos.length) {
      imageUrl = profile.photos[0].value;
    }
    return {
      id: profile.id,
      displayName: profile.displayName || 'Unknown Name',
      orgUser,
      imageUrl,
      email,
      tos: false,
    };
  }

  /**
   * Creates a user.
   * @param {PassportProfile} profile Response from OAuth authentication from Passport.
   * @param {string=} refreshToken OAuth refresh token. Not required.
   * @return {Promise<string>} A promise resolved to user id.
   */
  async createUser(profile, refreshToken) {
    const id = profile.id;
    const copy = this.extractOauthProfile(profile);
    const key = this.createUserKey(id);
    const results = [
      {
        name: 'displayName',
        value: copy.displayName,
        excludeFromIndexes: true,
      },
      {
        name: 'orgUser',
        value: copy.orgUser,
        excludeFromIndexes: true,
      },
      {
        name: 'tos', // terms of service
        value: false,
        excludeFromIndexes: true,
      },
    ];
    if (refreshToken) {
      results[results.length] = {
        name: 'refreshToken',
        value: refreshToken,
        excludeFromIndexes: true,
      };
    }
    if (copy.imageUrl) {
      results[results.length] = {
        name: 'imageUrl',
        value: copy.imageUrl,
        excludeFromIndexes: true,
      };
    }
    if (copy.email) {
      results[results.length] = {
        name: 'email',
        value: copy.email,
        excludeFromIndexes: true,
      };
    }
    const entity = {
      key,
      data: results,
    };
    await this.store.upsert(entity);
    return id;
  }

  /**
   * Returns a user if already exists or creates new user and returns new profile.
   * @param {PassportProfile} profile Response from OAuth authentication from Passport.
   * @param {string=} refreshToken OAuth refresh token. Not required.
   * @return {Promise<UserEntity>} Promise resolved to user profile info.
   */
  async findOrCreateUser(profile, refreshToken) {
    const user = await this.get(profile.id);
    if (!user) {
      await this.createUser(profile, refreshToken);
      return this.get(profile.id);
    }
    return user;
  }
}
