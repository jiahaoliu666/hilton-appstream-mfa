import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthContext';
import { useSecurityMonitor } from '@/lib/hooks/useSecurityMonitor';
import { 
  loginPath, 
  changePasswordPath, 
  mfaSetupPath,
  optionsPath
} from '@/utils/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// 不需要身份驗證的頁面路徑
const publicPaths = [loginPath, '/signup', '/forgot-password'];

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
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
  const isMfaSetupPage = router.pathname === mfaSetupPath;
  const isOptionsPage = router.pathname === optionsPath;

  const mfaEnabled = typeof window !== 'undefined' && localStorage.getItem('cognito_mfa_enabled') === 'true';

  useEffect(() => {
    // 只要在 mfa-setup 頁面且 setup_step 是 mfa，完全不做 redirect
    const setupStepFromStorage = typeof window !== 'undefined' ? localStorage.getItem('cognito_setup_step') : null;
    if (
      typeof window !== 'undefined' &&
      router.pathname === '/mfa-setup' &&
      setupStepFromStorage === 'mfa'
    ) {
      return;
    }
    // 如果正在加載身份驗證狀態，不執行任何重定向
    if (loading) return;

    // 檢查會話狀態
    const isSessionValid = typeof window !== 'undefined' && 
      localStorage.getItem('cognito_session_valid') === 'true';
    const lastSessionTime = typeof window !== 'undefined' ? 
      parseInt(localStorage.getItem('cognito_last_session_time') || '0') : 0;
    const sessionAge = Date.now() - lastSessionTime;
    const isSessionExpired = sessionAge > 24 * 60 * 60 * 1000; // 24小時過期

    // 檢查是否需要設置新密碼
    const isNewPasswordRequiredFromStorage = 
      typeof window !== 'undefined' && localStorage.getItem('cognito_new_password_required') === 'true';
    const needsNewPassword = newPasswordRequired || isNewPasswordRequiredFromStorage;

    // 檢查是否是首次登入流程
    const isFirstLoginFromStorage = typeof window !== 'undefined' ? 
      localStorage.getItem('cognito_first_login') === 'true' : false;
    const effectiveIsFirstLogin = isFirstLogin || isFirstLoginFromStorage;

    // 檢查設置步驟
    const effectiveCurrentSetupStep = 
      (currentSetupStep !== 'complete' && setupStepFromStorage) ? 
      setupStepFromStorage : 
      currentSetupStep;

    // 檢查 MFA 狀態
    const mfaEnabled = typeof window !== 'undefined' && 
      localStorage.getItem('cognito_mfa_enabled') === 'true';
    const needsMfaSetup = typeof window !== 'undefined' && 
      localStorage.getItem('cognito_mfa_setup_required') === 'true';

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
    if (isChangePasswordPage && needsNewPassword) {
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
      router.push(loginPath);
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

    // 處理 MFA 相關頁面的重定向邏輯
    if (mfaEnabled) {
      // 如果 MFA 已啟用，且需要設置
      if (needsMfaSetup && !isMfaSetupPage) {
        console.log('需要設置 MFA，重定向到 MFA 設置頁面');
        router.push(mfaSetupPath);
        return;
      }
    } else {
      // 如果 MFA 未啟用，且需要設置
      if (needsMfaSetup && !isMfaSetupPage) {
        console.log('需要設置 MFA，重定向到 MFA 設置頁面');
        router.push(mfaSetupPath);
        return;
      }
    }

    // 如果未登入且不是需要設置新密碼的情況，重定向到登入頁面
    if (!isAuthenticated && !needsNewPassword) {
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

  // 新增：允許 mfa-setup 頁面在 cognito_mfa_setup_required 為 true 時渲染
  const isMfaSetupRequiredFromStorage =
    typeof window !== 'undefined' && localStorage.getItem('cognito_mfa_setup_required') === 'true';

  // 首次登入流程頁面檢查（直接用 localStorage 判斷）
  const isFirstLoginFromStorage = typeof window !== 'undefined' ? 
    localStorage.getItem('cognito_first_login') === 'true' : false;
  const setupStepFromStorage = typeof window !== 'undefined' ? 
    localStorage.getItem('cognito_setup_step') : null;

  const isFirstLoginFlowPage = 
    (isFirstLoginFromStorage && setupStepFromStorage === 'password' && isChangePasswordPage) ||
    (isFirstLoginFromStorage && setupStepFromStorage === 'mfa' && isMfaSetupPage);

  // 簡化渲染條件判斷，減少可能的錯誤
  const shouldRender = 
    (isMfaSetupPage && isMfaSetupRequiredFromStorage) || // 最高優先
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
      isMfaSetupPage,
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