import { createApp } from "./app.js";
import { env } from "./lib/env.js";

const app = createApp();

const port = parseInt(env.PORT, 10);

console.log(`Starting server on port ${port}...`);

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Server running at http://localhost:${server.port}`);
