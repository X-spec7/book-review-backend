import Fastify, { FastifyInstance } from "fastify";
import fastifyCors from '@fastify/cors';
import jwt from '@fastify/jwt';
import sensible from '@fastify/sensible';
import cookie from '@fastify/cookie';
import rootRoutes from "./routes/root";

export async function buildApp(): Promise<FastifyInstance> {
  // const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
            target: 'pino-pretty',
            options: { colorize: true },
          }
          : undefined,
    },
  });

  await app.register(fastifyCors, {
    origin: true
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'supersecret',
    sign: { algorithm: 'HS256' }
  });

  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'super_secret_cookie', // optional for signed cookies
    parseOptions: {} // you can add cookie parser options here
  })

  await app.register(sensible);

  await app.register(rootRoutes, { prefix: '/' });

  app.get('/health', async () => {
    return { status: 'ok', time: new Date().toISOString() };
  });

  app.setErrorHandler(function (error, request, reply) {
    this.log.error(error);
    // don't leak internal details in production
    const status = (error.statusCode && Number(error.statusCode)) || 500;
    reply.status(status).send({ error: error.message || 'Internal Server Error' });
  });

  return app;
}
