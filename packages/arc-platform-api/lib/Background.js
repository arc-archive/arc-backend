// Copyright 2018, MuleSoft.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { EventEmitter } from 'events';
import { PubSub } from '@google-cloud/pubsub';
import logging from '@advanced-rest-client/arc-platform-logger';
import config from '@advanced-rest-client/backend-config';

/** @typedef {import('@google-cloud/pubsub').Topic} Topic */
/** @typedef {import('@google-cloud/pubsub').Subscription} Subscription */
/** @typedef {import('@google-cloud/pubsub').Message} Message */

/**
 * A class that contains logic to communicate with the background
 * apps through the PubSub system.
 * @extends EventEmitter
 */
class Background extends EventEmitter {
  /**
   * @constructor
   */
  constructor() {
    super();
    /**
     * @type {string}
     */
    this.topicGhWebhook = 'apic-gh-webhook';

    /**
     * @type {string}
     */
    this.topicTestProcess = 'apic-tests';

    /**
     * @type {String}
     */
    this.topicCoverageProcess = 'apic-coverage';

    /**
     * @type {PubSub}
     */
    this.pubsub = new PubSub({
      projectId: config.get('GCLOUD_PROJECT'),
    });
  }

  /**
   * Sends information to the background worker to queue a build
   * @param {string} id Build id
   * @return {Promise<void>}
   */
  async queueStageBuild(id) {
    const data = {
      action: 'process-build',
      id,
    };
    await this.publish(data, this.topicGhWebhook);
  }

  /**
   * Sends information to the background worker to remove build from it's queue.
   * @param {string} id Build id
   * @return {Promise<void>}
   */
  async dequeueBuild(id) {
    const data = {
      action: 'remove-build',
      id,
    };
    await this.publish(data, this.topicGhWebhook);
  }

  /**
   * Queues a test to be performed by the worker
   * @param {string} id Datastore id of the test
   * @return {Promise}
   */
  async queueTest(id) {
    const data = {
      action: 'runTest',
      id,
    };
    await this.publish(data, this.topicTestProcess);
  }

  /**
   * Removes a test from the queue. This is done by the tests runner
   * worker.
   *
   * @param {string} id The ID of the test
   * @return {Promise<void>}
   */
  async dequeueTest(id) {
    const data = {
      action: 'removeTest',
      id,
    };
    await this.publish(data, this.topicTestProcess);
  }

  /**
   * Queues a coverage run to be performed by the worker
   * @param {String} id Datastore id of the run
   * @return {Promise}
   */
  async queueCoverageRun(id) {
    const data = {
      action: 'runCoverage',
      id,
    };
    await this.publish(data, this.topicCoverageProcess);
  }

  /**
   * Removes a coverage run from the queue. This is done by the coverage runner
   * worker.
   *
   * @param {string} id The ID of the test
   * @return {Promise<void>}
   */
  async dequeueCoverageRun(id) {
    const data = {
      action: 'removeCoverage',
      id,
    };
    await this.publish(data, this.topicCoverageProcess);
  }

  /**
   * Publishes a message to a topic
   * @param {any} payload The message to send
   * @param {string} topicName The name of the topic to publish the message to.
   * @return {Promise<void>}
   */
  async publish(payload, topicName) {
    try {
      const topic = await this.getTopic(topicName);
      await topic.publisher.publish(Buffer.from(JSON.stringify(payload)));
      logging.info(`Message published to topic ${topicName}`);
    } catch (e) {
      logging.error('Error occurred while queuing background task', e);
    }
  }

  /**
   * Gets or creates Pub/Sub topic.
   * @param {string} name Topic name
   * @return {Promise<Topic>}
   */
  async getTopic(name) {
    try {
      const [topic] = await this.pubsub.topic(name).get();
      return topic;
    } catch (e) {
      logging.verbose(`Creating new topic ${name}`);
      const [topic] = await this.pubsub.createTopic(name);
      return topic;
    }
  }
}

const instance = new Background();
export default instance;
