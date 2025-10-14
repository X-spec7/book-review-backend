import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from '../services/authService';
import { ERROR_MESSAGES } from '../constants/messages';
import {
  LoginRequestBody,
  RefreshRequestBody,
  RegisterRequestBody
} from '../types/auth';

export class AuthController {
  private service: AuthService;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.service = new AuthService(fastify);
  }

  register = async (
    request: FastifyRequest<{ Body: RegisterRequestBody }>,
    reply: FastifyReply
  ) => {
    const result = await this.service.register(request.body);
    return reply.code(201).send(result);
  };

  login = async (
    request: FastifyRequest<{ Body: LoginRequestBody }>,
    reply: FastifyReply
  ) => {
    const result = await this.service.login(request.body);

    return reply.send(result);
  };

  refresh = async (
    request: FastifyRequest<{ Body: RefreshRequestBody }>,
    reply: FastifyReply
  ) => {
    const cookieToken = request.cookies?.[process.env.REFRESH_TOKEN_COOKIE_NAME || 'refresh_token'];
    const result = await this.service.refresh(request.body, cookieToken);

    // rotate cookie
    if (result && 'newRefreshTokenPlain' in result && result.newRefreshTokenPlain) {
      reply.setCookie(process.env.REFRESH_TOKEN_COOKIE_NAME || 'refresh_token', result.newRefreshTokenPlain, {
        httpOnly: true,
        path: '/auth/refresh',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS || 30)
      });
    }

    return reply.send({ accessToken: result.accessToken });
  };

  logout = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const cookieToken = request.cookies?.[process.env.REFRESH_TOKEN_COOKIE_NAME || 'refresh_token'];
    const result = await this.service.logout(cookieToken);
    reply.clearCookie(process.env.REFRESH_TOKEN_COOKIE_NAME || 'refresh_token', { path: '/auth/refresh' });
    return reply.send(result);
  };

  me = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const payload = (request as any).user;
    if (!payload || !payload.userId) return reply.code(401).send({ message: ERROR_MESSAGES.UNAUTHORIZED });
    const result = await this.service.me(payload.userId);
    if ('message' in result) return reply.code(404).send(result);
    return reply.send(result);
  };
}
