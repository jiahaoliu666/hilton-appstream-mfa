import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthContext';
import { SetupStep } from '@/components/common/SetupProgressIndicator';
import { useSecurityMonitor } from '@/lib/hooks/useSecurityMonitor';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// 不需要身份驗證的頁面路徑
const publicPaths = ['/login', '/signup', '/forgot-password'];

// 特殊路徑配置 
const changePasswordPath = '/change-password';
const mfaPath = '/mfa-verification'; // MFA 驗證頁面
const mfaSetupPath = '/mfa-setup'; // MFA 設置頁面

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { 
    isAuthenticated, 
    loading, 
    newPasswordRequired, 
    mfaRequired,
    // 安全設置流程相關
    isFirstLogin,
    currentSetupStep,
    isMfaSetupRequired,
    getUserMfaSettings
  } = useAuth();
  const router = useRouter();
  const { handleReturnToLogin } = useSecurityMonitor();

  const isPublicPage = publicPaths.includes(router.pathname);
  const isChangePasswordPage = router.pathname === changePasswordPath;
  const isMfaVerificationPage = router.pathname === mfaPath;
  const isMfaSetupPage = router.pathname === mfaSetupPath;

  useEffect(() => {
    // 如果正在加載身份驗證狀態，不執行任何重定向
    if (loading) return;

    // 檢查會話狀態
    const isSessionValid = typeof window !== 'undefined' && 
      localStorage.getItem('cognito_session_valid') === 'true';
    const lastSessionTime = typeof window !== 'undefined' ? 
      parseInt(localStorage.getItem('cognito_last_session_time') || '0') : 0;
    const sessionAge = Date.now() - lastSessionTime;
    const isSessionExpired = sessionAge > 24 * 60 * 60 * 1000; // 24小時過期

    // 檢查是否需要設置新密碼（從 localStorage 或狀態中獲取）
    const isNewPasswordRequiredFromStorage = 
      typeof window !== 'undefined' && localStorage.getItem('cognito_new_password_required') === 'true';
    const needsNewPassword = newPasswordRequired || isNewPasswordRequiredFromStorage;

    // 檢查是否是首次登入流程
    const isFirstLoginFromStorage = typeof window !== 'undefined' ? 
      localStorage.getItem('cognito_first_login') === 'true' : false;
    const effectiveIsFirstLogin = isFirstLogin || isFirstLoginFromStorage;

    // 檢查設置步驟
    const setupStepFromStorage = typeof window !== 'undefined' ? 
      localStorage.getItem('cognito_setup_step') as SetupStep : null;
    const effectiveCurrentSetupStep = 
      (currentSetupStep !== 'complete' && setupStepFromStorage) ? 
      setupStepFromStorage as SetupStep : 
      currentSetupStep;

    // 檢查是否有儲存的用戶名和密碼
    const hasStoredCredentials = typeof window !== 'undefined' && 
      localStorage.getItem('cognito_username') && 
      localStorage.getItem('cognito_password');

    // 如果是公開頁面，允許訪問
    if (isPublicPage) {
      return;
    }

    // 如果需要設置新密碼，且不在密碼設置頁面，重定向到密碼設置頁面
    if (needsNewPassword && !isChangePasswordPage) {
      console.log('需要設置新密碼，重定向到密碼設置頁面');
      router.push(changePasswordPath);
      return;
    }

    // 如果正在密碼設置頁面且需要設置密碼，允許停留
    if (isChangePasswordPage && (needsNewPassword || hasStoredCredentials)) {
      return;
    }

    // 如果會話已過期，清除所有狀態並重定向到登入頁面
    if (isSessionExpired) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cognito_session_valid');
        localStorage.removeItem('cognito_last_session_time');
        localStorage.removeItem('cognito_id_token');
        localStorage.removeItem('cognito_access_token');
        localStorage.removeItem('cognito_refresh_token');
      }
      router.push('/login');
      return;
    }

    // 處理首次登入流程
    if (effectiveIsFirstLogin) {
      if (effectiveCurrentSetupStep === 'password' && !isChangePasswordPage) {
        router.push(changePasswordPath);
        return;
      }
      if (effectiveCurrentSetupStep === 'mfa' && !isMfaSetupPage) {
        router.push(mfaSetupPath);
        return;
      }
    }

    // 如果未登入且不是需要設置新密碼的情況，重定向到登入頁面
    if (!isAuthenticated && !needsNewPassword && !hasStoredCredentials) {
      console.log('未登入用戶訪問受保護頁面，重定向到登入頁面');
      handleReturnToLogin();
      return;
    }

    // 如果已經登入且不需要其他驗證，但訪問登入頁面，重定向到首頁
    if (isAuthenticated && !needsNewPassword && isPublicPage) {
      console.log('已登入用戶訪問公開頁面，重定向到首頁');
      router.replace('/');
      return;
    }
  }, [
    isAuthenticated, 
    router, 
    router.pathname, 
    loading, 
    isPublicPage, 
    isChangePasswordPage,
    isMfaSetupPage,
    newPasswordRequired, 
    isFirstLogin,
    currentSetupStep,
    handleReturnToLogin
  ]);

  // 顯示加載指示器
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5',
      }}>
        <div>正在加載...</div>
      </div>
    );
  }

  // 簡化渲染條件判斷，減少可能的錯誤
  const isMfaRequiredFromStorage = 
    typeof window !== 'undefined' && localStorage.getItem('cognito_mfa_required') === 'true';
  const needsMfa = mfaRequired || isMfaRequiredFromStorage;
  
  const isNewPasswordRequiredFromStorage = 
    typeof window !== 'undefined' && localStorage.getItem('cognito_new_password_required') === 'true';
  const needsNewPassword = newPasswordRequired || isNewPasswordRequiredFromStorage;

  // 首次登入流程頁面檢查
  const isFirstLoginFlowPage = 
    (isFirstLogin && currentSetupStep === 'password' && isChangePasswordPage) || // 密碼設置頁面
    (isFirstLogin && currentSetupStep === 'mfa' && isMfaSetupPage); // MFA 設置頁面

  // 簡化渲染條件判斷，減少可能的錯誤
  const shouldRender = 
    isPublicPage || // 公開頁面始終渲染
    isAuthenticated || // 已登入用戶
    needsNewPassword || // 需要設置新密碼
    needsMfa || // 需要MFA驗證
    isFirstLoginFlowPage; // 首次登入流程的特定頁面
  
  if (!shouldRender) {
    console.log('Protected route not rendering, conditions:', {
      isPublicPage,
      isAuthenticated,
      needsMfa,
      isMfaVerificationPage,
      needsNewPassword,
      isChangePasswordPage,
      isFirstLogin,
      currentSetupStep,
      isFirstLoginFlowPage
    });
    return null;
  }

  return <>{children}</>;
}; 