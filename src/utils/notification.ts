import toast from 'react-hot-toast';
import { NOTIFICATION, COGNITO_ERROR_CODES } from './constants';

// 通知類型
type NotificationType = 'success' | 'error' | 'info' | 'warning';

// 通知選項
interface NotificationOptions {
  duration?: number;
  position?: typeof NOTIFICATION.POSITION[keyof typeof NOTIFICATION.POSITION];
}

/**
 * 顯示一個通知
 * @param message 通知消息
 * @param type 通知類型
 * @param options 通知選項
 */
export const showNotification = (
  message: string,
  type: NotificationType = 'info',
  options?: NotificationOptions
) => {
  const defaultOptions = {
    duration: NOTIFICATION.DURATION.DEFAULT,
    position: NOTIFICATION.POSITION.TOP_RIGHT,
  };

  switch (type) {
    case 'success':
      toast.success(message, { ...defaultOptions, ...options });
      break;
    case 'error':
      toast.error(message, { ...defaultOptions, ...options });
      break;
    case 'info':
    case 'warning':
    default:
      toast(message, {
        ...defaultOptions,
        ...options,
        icon: type === 'warning' ? '⚠️' : 'ℹ️',
      });
      break;
  }
};

/**
 * 顯示一個成功通知
 * @param message 通知消息
 * @param options 通知選項
 */
export const showSuccess = (message: string, options?: NotificationOptions) => {
  showNotification(message, 'success', {
    duration: NOTIFICATION.DURATION.SUCCESS,
    ...options,
  });
};

/**
 * 顯示一個錯誤通知
 * @param message 通知消息
 * @param options 通知選項
 */
export const showError = (message: string, options?: NotificationOptions) => {
  showNotification(message, 'error', {
    duration: NOTIFICATION.DURATION.ERROR,
    ...options,
  });
};

/**
 * 顯示一個信息通知
 * @param message 通知消息
 * @param options 通知選項
 */
export const showInfo = (message: string, options?: NotificationOptions) => {
  showNotification(message, 'info', options);
};

/**
 * 顯示一個警告通知
 * @param message 通知消息
 * @param options 通知選項
 */
export const showWarning = (message: string, options?: NotificationOptions) => {
  showNotification(message, 'warning', options);
};

/**
 * Cognito 錯誤消息映射
 */
export const mapCognitoErrorToMessage = (errorCode: string, errorMessage?: string): string => {
  // 新增：針對 user pool client 不存在的情境
  if (
    errorMessage &&
    errorMessage.includes('User pool client') &&
    errorMessage.includes('does not exist')
  ) {
    return '系統配置錯誤：請通知工程師團隊設置正確的環境變數';
  }

  const errorMessages: Record<string, string> = {
    [COGNITO_ERROR_CODES.USER_NOT_FOUND]: '查無此用戶，請向系統管理員註冊',
    [COGNITO_ERROR_CODES.NOT_AUTHORIZED]: '請確認電子郵件或密碼是否正確',
    [COGNITO_ERROR_CODES.RESOURCE_NOT_FOUND]: '系統配置錯誤：認證服務未正確設置，請聯繫系統管理員',
    [COGNITO_ERROR_CODES.USER_NOT_CONFIRMED]: '用戶尚未確認',
    [COGNITO_ERROR_CODES.USERNAME_EXISTS]: '用戶名已存在',
    [COGNITO_ERROR_CODES.INVALID_PASSWORD]: '密碼不符合要求',
    [COGNITO_ERROR_CODES.LIMIT_EXCEEDED]: '嘗試次數過多，請稍後再試',
    [COGNITO_ERROR_CODES.TOO_MANY_REQUESTS]: '請求過於頻繁，請稍後再試',
    [COGNITO_ERROR_CODES.INVALID_PARAMETER]: '輸入參數無效',
    [COGNITO_ERROR_CODES.CODE_MISMATCH]: '驗證碼不正確',
    [COGNITO_ERROR_CODES.EXPIRED_CODE]: '驗證碼已過期',
    [COGNITO_ERROR_CODES.CLIENT_NOT_FOUND]: '系統配置錯誤：請通知工程師團隊設置正確的環境變數',
  };

  return errorMessages[errorCode] || '發生未知錯誤，請稍後再試';
}; 