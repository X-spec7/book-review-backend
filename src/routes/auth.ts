import { FastifyPluginAsync, RouteGenericInterface } from 'fastify';
import { AuthController } from '../controllers/authController';
import { validateLoginBody, validateRegisterBody } from '../validation/authValidation';
import {
  RegisterRequestBody,
  RegisterResponseBody,
  LoginRequestBody,
  LoginResponseBody,
  RefreshRequestBody,
  RefreshResponseBody,
  LogoutResponseBody,
  MeResponseBody
} from '../types/auth';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const controller = new AuthController(fastify);

  // register
  interface RegisterRoute extends RouteGenericInterface {
    Body: RegisterRequestBody;
    Reply: RegisterResponseBody | { message: string };
  }
  fastify.post<RegisterRoute>(
    '/register',
    { preValidation: validateRegisterBody },
    controller.register
  );

  // login (issue access + refresh)
  interface LoginRoute extends RouteGenericInterface {
    Body: LoginRequestBody;
    Reply: LoginResponseBody | { message: string };
  }
  fastify.post<LoginRoute>(
    '/login',
    { preValidation: validateLoginBody },
    controller.login
  );

  // refresh endpoint (rotate refresh tokens)
  interface RefreshRoute extends RouteGenericInterface {
    Body: RefreshRequestBody;
    Reply: RefreshResponseBody | { message: string };
  }
  fastify.post<RefreshRoute>(
    '/refresh',
    controller.refresh
  );

  // logout (revoke refresh token)
  interface LogoutRoute extends RouteGenericInterface {
    Reply: LogoutResponseBody;
  }
  fastify.post<LogoutRoute>(
    '/logout',
    controller.logout
  );

  // me (protected)
  interface MeRoute extends RouteGenericInterface {
    Reply: MeResponseBody | { message: string };
  }
  fastify.get<MeRoute>(
    '/me',
    { preValidation: fastify.authenticate },
    controller.me
  );
};

export default authRoutes;
