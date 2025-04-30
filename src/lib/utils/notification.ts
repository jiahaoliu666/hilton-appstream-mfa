import toast from 'react-hot-toast';

// 通知類型
type NotificationType = 'success' | 'error' | 'info' | 'warning';

// 通知選項
interface NotificationOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
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
  switch (type) {
    case 'success':
      toast.success(message, options);
      break;
    case 'error':
      toast.error(message, options);
      break;
    case 'info':
    case 'warning':
    default:
      toast(message, {
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
  showNotification(message, 'success', options);
};

/**
 * 顯示一個錯誤通知
 * @param message 通知消息
 * @param options 通知選項
 */
export const showError = (message: string, options?: NotificationOptions) => {
  showNotification(message, 'error', options);
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
export const mapCognitoErrorToMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'UserNotFoundException':
      return '用戶名不存在';
    case 'NotAuthorizedException':
      return '密碼不正確';
    case 'UserNotConfirmedException':
      return '用戶尚未確認';
    case 'UsernameExistsException':
      return '用戶名已存在';
    case 'InvalidPasswordException':
      return '密碼不符合要求';
    case 'LimitExceededException':
      return '嘗試次數過多，請稍後再試';
    case 'TooManyRequestsException': 
      return '請求過於頻繁，請稍後再試';
    case 'InvalidParameterException':
      return '輸入參數無效';
    case 'CodeMismatchException':
      return '驗證碼不正確';
    case 'ExpiredCodeException':
      return '驗證碼已過期';
    default:
      return '發生未知錯誤，請稍後再試';
  }
}; 