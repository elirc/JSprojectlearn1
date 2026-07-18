/**
 * Composition root: build the app from its parts and listen.
 * Everything here is a choice a DIFFERENT deployment could make
 * differently (port, middleware, which features to mount).
 *
 *   node 65-rest-api/refactored/server.js
 *   curl localhost:3000/todos
 *   curl -X POST localhost:3000/todos -H 'content-type: application/json' -d '{"title":"hi"}'
 */
import { createApp, jsonBody } from './app.js';
import { createRepo, createService, registerTodoRoutes } from './todos.js';

export function buildApp() {
  const app = createApp();
  app.use(jsonBody());
  registerTodoRoutes(app, createService(createRepo()));
  return app;
}

// Only listen when run directly (tests import buildApp instead).
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  buildApp().listen(3000, () => console.log('listening on http://localhost:3000'));
}
