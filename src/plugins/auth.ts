import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
    authorize: (roles: string[]) => any;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // PreValidation decorator to verify access token
  fastify.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ message: 'Unauthorized' });
    }
  });

  // Authorization helper to check role(s)
  fastify.decorate('authorize', (roles: string[] = []) => {
    return async (request: any, reply: any) => {
      // request.user is populated by jwtVerify
      const user = request.user;
      if (!user) return reply.code(401).send({ message: 'Unauthorized' });
      if (!roles.includes(user.role)) {
        return reply.code(403).send({ message: 'Forbidden' });
      }
    };
  });
};

export default fp(authPlugin);
