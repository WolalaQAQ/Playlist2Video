import cors from '@fastify/cors';
import Fastify from 'fastify';
import {ZodError} from 'zod';
import type {ServerConfig} from './config';
import {data, errorResponse} from './lib/api-response';
import {AppError} from './lib/errors';
import {registerProjectRoutes} from './modules/projects/project-routes';
import {registerExportRoutes} from './modules/exports/export-routes';

export async function buildApp(config: ServerConfig) {
  const app = Fastify({logger: true});
  await app.register(cors, {origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], methods: ['GET', 'HEAD', 'POST', 'PATCH']});
  app.get('/api/v1/health', async () => data({ok: true}));
  await registerProjectRoutes(app, config);
  await registerExportRoutes(app, config);
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) return reply.status(422).send(errorResponse('validation_error', 'Request validation failed', error.issues));
    if (error instanceof AppError) return reply.status(error.statusCode).send(errorResponse(error.code, error.message, error.details));
    app.log.error(error);
    return reply.status(500).send(errorResponse('internal_error', 'An unexpected error occurred'));
  });
  return app;
}


