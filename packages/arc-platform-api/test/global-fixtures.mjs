/* eslint-disable arrow-body-style */
import { server, serverStartPromise } from '../index.mjs';

export const mochaGlobalSetup = async () => {
  await serverStartPromise;
  const { port } = /** @type AddressInfo */ (server.address());
  console.log(`server running on port ${port}`);
};

export const mochaGlobalTeardown = async () => {
  return new Promise((resolve) => {
    server.close(() => {
      console.log('App server closed');
      resolve();
    });
  });
};
