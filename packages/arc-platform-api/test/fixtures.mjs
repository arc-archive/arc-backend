/* eslint-disable arrow-body-style */
import { server, serverStartPromise } from '../index.mjs';

export async function mochaGlobalSetup() {
  await serverStartPromise;
  const { port } = /** @type AddressInfo */ (server.address());
  console.log(`server running on port ${port}`);
}

export async function mochaGlobalTeardown() {
  return new Promise((resolve) => {
    console.log('Stopping API server');
    server.close(() => {
      console.log('App server closed');
      resolve();
    });
  });
}
