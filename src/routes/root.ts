import { FastifyPluginAsync } from "fastify";

const rootRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    return { message: 'Hello from Fastify + Typescript' }
  })
}

export default rootRoutes;
