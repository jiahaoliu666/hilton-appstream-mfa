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

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, newPasswordRequired } = useAuth();
  const router = useRouter();

  const isPublicPage = publicPaths.includes(router.pathname);
  const isChangePasswordPage = router.pathname === changePasswordPath;

  useEffect(() => {
    // 如果正在加載身份驗證狀態，不執行任何重定向
    if (loading) return;

    // 檢查是否需要設置新密碼（從 localStorage 或狀態中獲取）
    const isNewPasswordRequiredFromStorage = 
      typeof window !== 'undefined' && localStorage.getItem('cognito_new_password_required') === 'true';
    const needsNewPassword = newPasswordRequired || isNewPasswordRequiredFromStorage;
    
    // 處理首次登入需要設置新密碼的情況
    if (needsNewPassword) {
      // 如果需要設置新密碼，但不在設置密碼頁面，則重定向到設置密碼頁面
      if (!isChangePasswordPage) {
        router.push(changePasswordPath);
        return;
      }
    } else {
      // 如果不需要設置新密碼，但在設置密碼頁面，則重定向到首頁
      if (isChangePasswordPage) {
        router.push('/');
        return;
      }
    }

    // 如果用戶未登入且訪問的不是公開頁面，重定向到登入頁面
    if (!isAuthenticated && !isPublicPage && !isChangePasswordPage) {
      router.push('/login');
    }
    
    // 如果用戶已登入但正在訪問登入頁面，重定向到首頁
    if (isAuthenticated && isPublicPage) {
      router.replace('/');
    }
  }, [isAuthenticated, router, router.pathname, loading, isPublicPage, isChangePasswordPage, newPasswordRequired]);

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

  // 檢查是否需要設置新密碼（從 localStorage 或狀態中獲取）
  const isNewPasswordRequiredFromStorage = 
    typeof window !== 'undefined' && localStorage.getItem('cognito_new_password_required') === 'true';
  const needsNewPassword = newPasswordRequired || isNewPasswordRequiredFromStorage;

  // 如果需要設置新密碼但不在設置密碼頁面，不顯示內容
  if (needsNewPassword && !isChangePasswordPage) {
    return null;
  }

  // 如果不需要設置新密碼但在設置密碼頁面，不顯示內容
  if (!needsNewPassword && isChangePasswordPage) {
    return null;
  }

  // 如果用戶未登入且不在公開頁面，不顯示內容
  if (!isAuthenticated && !isPublicPage && !isChangePasswordPage) {
    return null;
  }

  // 如果用戶已登入但正在訪問公開頁面，等待重定向完成
  if (isAuthenticated && isPublicPage) {
    return null;
  }

  return <>{children}</>;
}; 