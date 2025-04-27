import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// 不需要身份驗證的頁面路徑
const publicPaths = ['/login', '/signup', '/forgot-password'];

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const isPublicPage = publicPaths.includes(router.pathname);

  useEffect(() => {
    // 如果正在加載身份驗證狀態，不執行任何重定向
    if (loading) return;

    // 如果用戶未登入且訪問的不是公開頁面，重定向到登入頁面
    if (!isAuthenticated && !isPublicPage) {
      router.push('/login');
    }
    
    // 如果用戶已登入但正在訪問登入頁面，重定向到首頁
    if (isAuthenticated && isPublicPage) {
      router.replace('/');
    }
  }, [isAuthenticated, router, router.pathname, loading, isPublicPage]);

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

  // 如果用戶未登入且不在公開頁面，不顯示內容
  if (!isAuthenticated && !isPublicPage) {
    return null;
  }

  // 如果用戶已登入但正在訪問公開頁面，等待重定向完成
  if (isAuthenticated && isPublicPage) {
    return null;
  }

  return <>{children}</>;
}; 