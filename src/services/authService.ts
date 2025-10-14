import { FastifyInstance } from 'fastify';
import { ERROR_MESSAGES } from '../constants/messages';
import {
  hashPassword,
  verifyPassword,
  generateRefreshTokenPlain,
  hashRefreshToken,
  verifyRefreshTokenHash
} from '../utils/auth';
import {
  LoginRequestBody,
  LoginResponseBody,
  LogoutResponseBody,
  RefreshRequestBody,
  RefreshResponseBody,
  RegisterRequestBody,
  RegisterResponseBody
} from '../types/auth';

export class AuthService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  async register(
    body: RegisterRequestBody
  ): Promise<RegisterResponseBody> {
    const { first_name, last_name, email, password, role } = body;

    const existing = await this.fastify.prisma.user.findUnique({ where: { email } });
    if (existing) throw this.fastify.httpErrors.conflict(ERROR_MESSAGES.EMAIL_IN_USE);

    const hashed_password = await hashPassword(password);

    const user = await this.fastify.prisma.user.create({
      data: { first_name, last_name, email, hashed_password, role }
    });

    return { id: user.id, email: user.email };
  }

  async login(
    body: LoginRequestBody
  ): Promise<LoginResponseBody> {
    const { email, password } = body;
    const user = await this.fastify.prisma.user.findUnique({ where: { email } });
    if (!user) throw this.fastify.httpErrors.badRequest(ERROR_MESSAGES.SIGNIN_FAILED);

    const ok = await verifyPassword(user.hashed_password, password);
    if (!ok) throw this.fastify.httpErrors.badRequest(ERROR_MESSAGES.SIGNIN_FAILED);

    const accessToken = this.fastify.jwt.sign({ userId: user.id, role: user.role }, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' });

    const plainRefresh = generateRefreshTokenPlain();
    const refreshHash = await hashRefreshToken(plainRefresh);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS || 30));

    await this.fastify.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: refreshHash, expiresAt }
    });

    return { accessToken };
  }

  async refresh(
    body: RefreshRequestBody,
    cookieToken?: string
  ): Promise<RefreshResponseBody & { newRefreshTokenPlain?: string }> {
    const token = cookieToken;
    if (!token) throw this.fastify.httpErrors.unauthorized(ERROR_MESSAGES.NO_REFRESH_TOKEN);

    const candidateTokens = await this.fastify.prisma.refreshToken.findMany({
      where: { revoked: false, expiresAt: { gt: new Date() } }
    });

    let found: any = null;
    for (const t of candidateTokens) {
      if (await verifyRefreshTokenHash(t.tokenHash, token)) { found = t; break; }
    }
    if (!found) throw this.fastify.httpErrors.unauthorized(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);

    await this.fastify.prisma.refreshToken.update({ where: { id: found.id }, data: { revoked: true } });

    const newPlain = generateRefreshTokenPlain();
    const newHash = await hashRefreshToken(newPlain);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS || 30));

    await this.fastify.prisma.refreshToken.create({
      data: { userId: found.userId, tokenHash: newHash, expiresAt, replacedBy: null }
    });

    const user = await this.fastify.prisma.user.findUnique({ where: { id: found.userId } });
    if (!user) throw this.fastify.httpErrors.unauthorized(ERROR_MESSAGES.USER_NOT_FOUND);

    const accessToken = this.fastify.jwt.sign(
      { userId: user.id, role: user.role },
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' }
    );
    return { accessToken, newRefreshTokenPlain: newPlain };
  }

  async logout(
    cookieToken?: string
  ): Promise<LogoutResponseBody> {
    const token = cookieToken;
    if (!token) return { ok: true };

    const tokens = await this.fastify.prisma.refreshToken.findMany({ where: { revoked: false, expiresAt: { gt: new Date() } } });
    for (const t of tokens) {
      if (await verifyRefreshTokenHash(t.tokenHash, token)) {
        await this.fastify.prisma.refreshToken.update({ where: { id: t.id }, data: { revoked: true } });
        break;
      }
    }
    return { ok: true };
  }

  async me(userId: string): Promise<{ message: string } | any> {
    const user = await this.fastify.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw this.fastify.httpErrors.notFound(ERROR_MESSAGES.NOT_FOUND);
    const { hashed_password, ...publicUser } = user as any;
    return publicUser;
  }
}
