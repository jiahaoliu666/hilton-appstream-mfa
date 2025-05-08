import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthContext';
import { SetupStep } from '@/components/common/SetupProgressIndicator';

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

  const isPublicPage = publicPaths.includes(router.pathname);
  const isChangePasswordPage = router.pathname === changePasswordPath;
  const isMfaVerificationPage = router.pathname === mfaPath;
  const isMfaSetupPage = router.pathname === mfaSetupPath;

  useEffect(() => {
    // 如果正在加載身份驗證狀態，不執行任何重定向
    if (loading) return;

    // 檢查是否存在從 MFA 頁面返回登入頁面的標記
    const isReturningFromMfa = 
      typeof window !== 'undefined' && sessionStorage.getItem('returningFromMfa') === 'true';
    
    // 檢查是否存在從密碼設置頁面返回登入頁面的標記
    const isReturningFromPasswordChange = 
      typeof window !== 'undefined' && sessionStorage.getItem('returningFromPasswordChange') === 'true';
    
    // 如果存在任一標記，清除它並允許返回登入頁面
    if ((isReturningFromMfa || isReturningFromPasswordChange) && router.pathname === '/login') {
      sessionStorage.removeItem('returningFromMfa');
      sessionStorage.removeItem('returningFromPasswordChange');
      return; // 允許繼續訪問登入頁面
    }

    // 從 localStorage 讀取關鍵狀態標記
    const isFirstLoginFromStorage = typeof window !== 'undefined' ? 
      localStorage.getItem('cognito_first_login') === 'true' : false;
    
    const setupStepFromStorage = typeof window !== 'undefined' ? 
      localStorage.getItem('cognito_setup_step') as SetupStep : null;
      
    const isMfaSetupRequiredFromStorage = typeof window !== 'undefined' ? 
      localStorage.getItem('cognito_mfa_setup_required') !== 'false' : true;

    // 合併記憶體狀態和 localStorage 狀態
    const effectiveIsFirstLogin = isFirstLogin || isFirstLoginFromStorage;
    const effectiveCurrentSetupStep = 
      (currentSetupStep !== 'complete' && setupStepFromStorage) ? 
      setupStepFromStorage as SetupStep : 
      currentSetupStep;
    const effectiveIsMfaSetupRequired = isMfaSetupRequired || isMfaSetupRequiredFromStorage;
    
    console.log('ProtectedRoute檢測條件:', {
      path: router.pathname,
      isPublicPage,
      isMfaVerificationPage,
      isChangePasswordPage,
      isMfaSetupPage,
      isAuthenticated,
      newPasswordRequired,
      mfaRequired,
      isFirstLogin,
      effectiveIsFirstLogin,
      currentSetupStep,
      effectiveCurrentSetupStep,
      localStorage: {
        first_login: isFirstLoginFromStorage,
        setup_step: setupStepFromStorage,
        mfa_required: localStorage.getItem('cognito_mfa_required'),
        new_password_required: localStorage.getItem('cognito_new_password_required')
      }
    });

    // 檢查是否需要設置新密碼（從 localStorage 或狀態中獲取）
    const isNewPasswordRequiredFromStorage = 
      typeof window !== 'undefined' && localStorage.getItem('cognito_new_password_required') === 'true';
    const needsNewPassword = newPasswordRequired || isNewPasswordRequiredFromStorage;
    
    // 檢查是否需要 MFA 驗證
    const isMfaRequiredFromStorage =
      typeof window !== 'undefined' && localStorage.getItem('cognito_mfa_required') === 'true';
    const needsMfa = mfaRequired || isMfaRequiredFromStorage;
    
    // --- 重要: 明確的路由保護優先級順序 ---
    
    // 1. 如果未登入且嘗試訪問受保護頁面，重定向到登入頁面
    if (!isAuthenticated && !isPublicPage && !needsNewPassword && !needsMfa) {
      console.log('未登入用戶訪問受保護頁面，重定向到登入頁面');
      router.push('/login');
      return;
    }
    
    // 2. 如果需要設置新密碼，且不在密碼設置頁面，重定向到密碼設置頁面
    if (needsNewPassword && !isChangePasswordPage) {
      console.log('需要設置新密碼，重定向到密碼設置頁面');
      router.push(changePasswordPath);
      return;
    }
    
    // 3. 如果正在密碼設置頁面且需要設置密碼，允許停留
    if (isChangePasswordPage && needsNewPassword) {
      return;
    }
    
    // 4. 處理首次登入的安全設置流程
    if (effectiveIsFirstLogin) {
      console.log('首次登入流程檢測 - 當前步驟:', effectiveCurrentSetupStep);
      
      // 如果處於 password 階段，重定向到密碼設置頁面
      if (effectiveCurrentSetupStep === 'password' && !isChangePasswordPage) {
        console.log('首次登入流程: 密碼階段，重定向到密碼設置頁面');
        router.push(changePasswordPath);
        return;
      }
      
      // 如果已完成密碼設置，處於 mfa 階段，且MFA設置是必須的，重定向到MFA設置頁面
      if (effectiveCurrentSetupStep === 'mfa' && !isMfaSetupPage && effectiveIsMfaSetupRequired) {
        console.log('首次登入流程: MFA階段，重定向到MFA設置頁面');
        router.push(mfaSetupPath);
        return;
      }
      
      // 如果已完成全部設置，但仍在設置頁面，重定向到首頁
      if (effectiveCurrentSetupStep === 'complete' && (isChangePasswordPage || isMfaSetupPage)) {
        console.log('首次登入流程: 設置已完成，重定向到首頁');
        router.push('/');
        return;
      }
    }
    
    // 5. 處理需要MFA驗證的情況
    if (needsMfa && !isMfaVerificationPage && isAuthenticated) {
      console.log('需要MFA驗證，重定向到MFA驗證頁面');
      router.push(mfaPath);
      return;
    }
    
    // 6. 如果在MFA驗證頁面且確實需要MFA，允許停留
    if (isMfaVerificationPage && needsMfa) {
      return;
    }
    
    // 7. 如果已經登入且不需要其他驗證，但訪問登入頁面或公開頁面，重定向到首頁
    if (isAuthenticated && !needsMfa && !needsNewPassword && isPublicPage) {
      console.log('已登入用戶訪問公開頁面，重定向到首頁');
      router.replace('/');
      return;
    }
    
    // 8. 檢查MFA設置狀態 - 只有在非首次登入流程時執行
    // 避免與首次登入流程衝突
    if (isAuthenticated && !effectiveIsFirstLogin && !needsMfa && !needsNewPassword) {
      const checkMfaStatus = async () => {
        try {
          // 檢查MFA設置狀態
          const mfaResult = await getUserMfaSettings();
          const isMfaEnabled = mfaResult.enabled || false;
          
          console.log('檢查MFA設置狀態結果:', {
            isMfaEnabled,
            isMfaSetupRequired: effectiveIsMfaSetupRequired
          });
          
          // 如果MFA設置是必須的，但未設置，且不在MFA設置頁面
          if (!isMfaEnabled && effectiveIsMfaSetupRequired && !isMfaSetupPage) {
            console.log('檢測到MFA未設置，重定向到MFA設置頁面');
            router.push(mfaSetupPath);
          }
        } catch (error) {
          console.error('檢查MFA狀態出錯:', error);
        }
      };
      
      // 只在非設置相關頁面，且不是公開頁面時檢查
      if (!isMfaSetupPage && !isChangePasswordPage && !isPublicPage) {
        checkMfaStatus();
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
    isMfaVerificationPage,
    newPasswordRequired, 
    mfaRequired, 
    isFirstLogin,
    currentSetupStep,
    isMfaSetupRequired,
    getUserMfaSettings
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