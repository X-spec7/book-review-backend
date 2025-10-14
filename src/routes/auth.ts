import { FastifyPluginAsync } from 'fastify';
import {
  hashPassword,
  verifyPassword,
  generateRefreshTokenPlain,
  hashRefreshToken,
  verifyRefreshTokenHash
} from '../utils/auth';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // register
  fastify.post('/register', async (request, reply) => {
    const { first_name, last_name, email, password, role } = request.body as any;

    // basic validation (enforce stronger in prod)
    if (!email || !password) return reply.code(400).send({ message: 'email and password required' });

    const existing = await fastify.prisma.user.findUnique({ where: { email } });
    if (existing) return reply.code(409).send({ message: 'Email already in use' });

    const hashed_password = await hashPassword(password);

    const user = await fastify.prisma.user.create({
      data: { first_name, last_name, email, hashed_password, role }
    });

    reply.code(201).send({ id: user.id, email: user.email });
  });

  // login (issue access + refresh)
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as any;
    const user = await fastify.prisma.user.findUnique({ where: { email } });
    if (!user) return reply.code(400).send({ message: 'Invalid credentials' });

    const ok = await verifyPassword(user.hashed_password, password);
    if (!ok) return reply.code(400).send({ message: 'Invalid credentials' });

    // create access token
    const accessToken = fastify.jwt.sign({ userId: user.id, role: user.role }, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' });

    // create refresh token (plaintext to send to client, store only hashed)
    const plainRefresh = generateRefreshTokenPlain();
    const refreshHash = await hashRefreshToken(plainRefresh);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS || 30));

    const rt = await fastify.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt
      }
    });

    // send refresh token in httpOnly secure cookie OR in body depending on your frontend
    // Example: set cookie (recommended for browsers)
    reply
      .setCookie(process.env.REFRESH_TOKEN_COOKIE_NAME || 'refresh_token', plainRefresh, {
        httpOnly: true,
        path: '/auth/refresh',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS || 30) // seconds
      })
      .send({ accessToken });
  });

  // refresh endpoint (rotate refresh tokens)
  fastify.post('/refresh', async (request, reply) => {
    // try cookie first
    const token = request.cookies?.[process.env.REFRESH_TOKEN_COOKIE_NAME || 'refresh_token'] || (request.body as any)?.refreshToken;
    if (!token) return reply.code(401).send({ message: 'No refresh token' });

    // find candidate tokens for user: we must verify hash for stored tokens
    // naive approach: find all non-revoked tokens that haven't expired for any user,
    const candidateTokens = await fastify.prisma.refreshToken.findMany({
      where: { revoked: false, expiresAt: { gt: new Date() } }
    });

    // verify against hash (this can be optimized by storing a token id in cookie instead)
    let found = null as any;
    for (const t of candidateTokens) {
      if (await verifyRefreshTokenHash(t.tokenHash, token)) {
        found = t;
        break;
      }
    }
    if (!found) return reply.code(401).send({ message: 'Invalid refresh token' });

    // rotation: revoke current token and create a new one
    await fastify.prisma.refreshToken.update({ where: { id: found.id }, data: { revoked: true } });

    const newPlain = generateRefreshTokenPlain();
    const newHash = await hashRefreshToken(newPlain);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS || 30));

    const newRt = await fastify.prisma.refreshToken.create({
      data: {
        userId: found.userId,
        tokenHash: newHash,
        expiresAt,
        replacedBy: null
      }
    });

    // sign new access token
    const user = await fastify.prisma.user.findUnique({ where: { id: found.userId } });
    if (!user) return reply.code(401).send({ message: 'User not found' });

    const accessToken = fastify.jwt.sign({ userId: user.id, role: user.role }, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' });

    // set new cookie
    reply
      .setCookie(process.env.REFRESH_TOKEN_COOKIE_NAME || 'refresh_token', newPlain, {
        httpOnly: true,
        path: '/auth/refresh',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS || 30)
      })
      .send({ accessToken });
  });

  // logout (revoke refresh token)
  fastify.post('/logout', async (request, reply) => {
    const token = request.cookies?.[process.env.REFRESH_TOKEN_COOKIE_NAME || 'refresh_token'] || (request.body as any)?.refreshToken;
    if (!token) return reply.send({ ok: true }); // nothing to do

    // find and revoke
    const tokens = await fastify.prisma.refreshToken.findMany({
      where: { revoked: false, expiresAt: { gt: new Date() } }
    });

    for (const t of tokens) {
      if (await verifyRefreshTokenHash(t.tokenHash, token)) {
        await fastify.prisma.refreshToken.update({ where: { id: t.id }, data: { revoked: true }});
        break;
      }
    }

    // clear cookie
    reply.clearCookie(process.env.REFRESH_TOKEN_COOKIE_NAME || 'refresh_token', { path: '/auth/refresh' });
    return reply.send({ ok: true });
  });

  // me (protected)
  fastify.get('/me', { preValidation: fastify.authenticate }, async (request, reply) => {
    const payload = (request as any).user;
    const user = await fastify.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return reply.code(404).send({ message: 'Not found' });
    // omit sensitive fields
    const { hashed_password, ...publicUser } = user as any;
    return publicUser;
  });
};

export default authRoutes;
