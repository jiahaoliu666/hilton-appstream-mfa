// 認證相關路徑
export const AUTH_PATHS = {
  LOGIN: '/login',
  CHANGE_PASSWORD: '/change-password',
  MFA_SETUP: '/mfa-setup',
  OPTIONS: '/options',
} as const;

// 通知相關常量
export const NOTIFICATION = {
  DURATION: {
    DEFAULT: 3000,
    SUCCESS: 2000,
    ERROR: 4000,
  },
  POSITION: {
    TOP_RIGHT: 'top-right',
    TOP_CENTER: 'top-center',
    TOP_LEFT: 'top-left',
    BOTTOM_RIGHT: 'bottom-right',
    BOTTOM_CENTER: 'bottom-center',
    BOTTOM_LEFT: 'bottom-left',
  },
} as const;

// Cognito 錯誤代碼
export const COGNITO_ERROR_CODES = {
  USER_NOT_FOUND: 'UserNotFoundException',
  NOT_AUTHORIZED: 'NotAuthorizedException',
  RESOURCE_NOT_FOUND: 'ResourceNotFoundException',
  USER_NOT_CONFIRMED: 'UserNotConfirmedException',
  USERNAME_EXISTS: 'UsernameExistsException',
  INVALID_PASSWORD: 'InvalidPasswordException',
  LIMIT_EXCEEDED: 'LimitExceededException',
  TOO_MANY_REQUESTS: 'TooManyRequestsException',
  INVALID_PARAMETER: 'InvalidParameterException',
  CODE_MISMATCH: 'CodeMismatchException',
  EXPIRED_CODE: 'ExpiredCodeException',
} as const; 