import Emulator from 'google-datastore-emulator';

process.env.GCLOUD_PROJECT = 'abc-test'; // 'advancedrestclient-1155';
let emulator = /** @type Emulator */ (null);

export const mochaHooks = {
  async beforeAll() {
    emulator = new Emulator({ consistency: '1.0', debug: true });
    await emulator.start();
    console.log(`GC emulator is running.`);
  },

  async afterAll() {
    console.log('Stopping GC emulator');
    await emulator.stop();
  },
};
