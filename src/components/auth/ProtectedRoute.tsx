import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// 不需要身份驗證的頁面路徑
const publicPaths = ['/login', '/signup', '/forgot-password'];

// 特殊路徑配置 
const changePasswordPath = '/change-password';
const mfaPath = '/login'; // MFA 驗證在登入頁面進行
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
    isMfaSetupRequired
  } = useAuth();
  const router = useRouter();

  const isPublicPage = publicPaths.includes(router.pathname);
  const isChangePasswordPage = router.pathname === changePasswordPath;
  const isLoginPage = router.pathname === mfaPath;
  const isMfaSetupPage = router.pathname === mfaSetupPath;

  useEffect(() => {
    // 如果正在加載身份驗證狀態，不執行任何重定向
    if (loading) return;

    // 檢查是否需要設置新密碼（從 localStorage 或狀態中獲取）
    const isNewPasswordRequiredFromStorage = 
      typeof window !== 'undefined' && localStorage.getItem('cognito_new_password_required') === 'true';
    const needsNewPassword = newPasswordRequired || isNewPasswordRequiredFromStorage;
    
    // 檢查是否需要 MFA 驗證
    const isMfaRequiredFromStorage =
      typeof window !== 'undefined' && localStorage.getItem('cognito_mfa_required') === 'true';
    const needsMfa = mfaRequired || isMfaRequiredFromStorage;
    
    // 首次登入設置流程處理
    if (isFirstLogin) {
      // 如果處於 password 階段但不在密碼設置頁面，重定向到密碼設置頁面
      if (currentSetupStep === 'password' && !isChangePasswordPage) {
        router.push(changePasswordPath);
        return;
      }
      
      // 如果處於 mfa 階段但不在 MFA 設置頁面，且 MFA 設置是必須的，重定向到 MFA 設置頁面
      if (currentSetupStep === 'mfa' && !isMfaSetupPage && isMfaSetupRequired) {
        router.push(mfaSetupPath);
        return;
      }
    }
    // 一般登入流程處理
    else {
      // 處理首次登入需要設置新密碼的情況
      if (needsNewPassword && !isChangePasswordPage) {
        router.push(changePasswordPath);
        return;
      }
      
      // 處理需要 MFA 驗證的情況，重定向到登入頁面進行 MFA 驗證
      if (needsMfa && !isLoginPage) {
        router.push(mfaPath);
        return;
      }
      
      // 如果已經登入且不需要 MFA 和新密碼，但訪問的是登入頁面，重定向到首頁
      if (isAuthenticated && !needsMfa && !needsNewPassword && isPublicPage) {
        router.replace('/');
        return;
      }
      
      // 如果未登入且訪問的不是公開頁面，重定向到登入頁面
      if (!isAuthenticated && !isPublicPage && !needsMfa && !needsNewPassword) {
        router.push('/login');
        return;
      }
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
    mfaRequired, 
    isLoginPage,
    isFirstLogin,
    currentSetupStep,
    isMfaSetupRequired
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

  // 始終渲染以下情況：
  // 1. 在公開頁面（如登入頁面）
  // 2. 已驗證的用戶訪問非公開頁面
  // 3. 需要 MFA 且在登入頁面
  // 4. 需要設置新密碼且在設置密碼頁面
  // 5. 首次登入流程的相關頁面
  
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

  // 以下情況渲染內容:
  const shouldRender = 
    isPublicPage || // 公開頁面始終渲染
    (isAuthenticated && !isPublicPage) || // 已登入用戶訪問非公開頁面
    (needsMfa && isLoginPage) || // 需要 MFA 且在登入頁面
    (needsNewPassword && isChangePasswordPage) || // 需要設置新密碼且在設置密碼頁面
    isFirstLoginFlowPage; // 首次登入流程的特定頁面
  
  if (!shouldRender) {
    console.log('Protected route not rendering, conditions:', {
      isPublicPage,
      isAuthenticated,
      needsMfa,
      isLoginPage,
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