import { FastifyRequest } from 'fastify';
import { ERROR_MESSAGES } from '../constants/messages';
import { LoginRequestBody, RegisterRequestBody } from '../types/auth';

export async function validateRegisterBody(
  request: FastifyRequest<{ Body: RegisterRequestBody }>,
  // reply: FastifyReply
) {
  const { email, password, first_name, last_name, role } = request.body || ({} as RegisterRequestBody);
  if (!email || !password) {
    throw (request as any).server.httpErrors.badRequest(ERROR_MESSAGES.EMAIL_PASSWORD_REQUIRED);
  }
  if (!first_name || !last_name || !role) {
    throw (request as any).server.httpErrors.badRequest(ERROR_MESSAGES.MISSING_REQUIRED_FIELDS);
  }
}

export async function validateLoginBody(
  request: FastifyRequest<{ Body: LoginRequestBody }>,
  // reply: FastifyReply
) {
  const { email, password } = request.body || ({} as LoginRequestBody);
  if (!email || !password) {
    throw (request as any).server.httpErrors.badRequest(ERROR_MESSAGES.EMAIL_PASSWORD_REQUIRED);
  }
}
