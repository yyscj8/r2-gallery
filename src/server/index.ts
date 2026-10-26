import { createServer } from './app';

const app = createServer();

export default {
  fetch: app.fetch,
};
