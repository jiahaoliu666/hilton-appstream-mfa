import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/components/auth/AuthContext';
import { showInfo } from '@/lib/utils/notification';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10分鐘，以毫秒為單位

export const useSecurityMonitor = () => {
  const { clearAllCredentials, isFirstLogin } = useAuth();
  const router = useRouter();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // 重置無活動計時器
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    lastActivityRef.current = Date.now();
    inactivityTimerRef.current = setTimeout(() => {
      if (isFirstLogin) {
        showInfo('由於長時間無活動，您的安全設置會話已過期。請重新登入。');
        clearAllCredentials();
        router.push('/login');
      }
    }, INACTIVITY_TIMEOUT);
  }, [clearAllCredentials, isFirstLogin, router]);

  // 監聽用戶活動
  useEffect(() => {
    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    // 監聽用戶活動事件
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    // 監聽頁面可見性變化
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetInactivityTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 監聽頁面離開
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFirstLogin) {
        clearAllCredentials();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 初始化計時器
    resetInactivityTimer();

    // 清理函數
    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [clearAllCredentials, isFirstLogin, resetInactivityTimer]);

  // 處理返回登入頁面
  const handleReturnToLogin = useCallback(() => {
    if (isFirstLogin) {
      clearAllCredentials();
    }
    router.push('/login');
  }, [clearAllCredentials, isFirstLogin, router]);

  return {
    handleReturnToLogin
  };
}; 