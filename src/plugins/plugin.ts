import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prismaPlugin = fp(async (fastify) => {
  const prisma = new PrismaClient()
  await prisma.$connect()

  // Make Prisma available through fastify.prisma
  fastify.decorate('prisma', prisma)

  // Gracefully disconnect on close
  fastify.addHook('onClose', async (app) => {
    await app.prisma.$disconnect()
  })
})

export default prismaPlugin
