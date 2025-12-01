export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  INVALID_CREDENTIALS: 'Invalid credentials',
  SIGNIN_FAILED: 'Invalid credentials',
  EMAIL_IN_USE: 'Email already in use',
  EMAIL_PASSWORD_REQUIRED: 'email and password required',
  MISSING_REQUIRED_FIELDS: 'missing required fields',
  NO_REFRESH_TOKEN: 'No refresh token',
  INVALID_REFRESH_TOKEN: 'Invalid refresh token',
  USER_NOT_FOUND: 'User not found',
  NOT_FOUND: 'Not found'
} as const;

export const SUCCESS_MESSAGES = {
  LOGOUT_OK: 'Logged out successfully'
} as const;
