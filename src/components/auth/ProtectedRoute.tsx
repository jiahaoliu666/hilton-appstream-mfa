import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 不重定向登入頁面本身，避免無限循環
    if (!isAuthenticated && router.pathname !== '/login') {
      router.push('/login');
    }
    
    // 如果用戶已登入但正在訪問登入頁面，重定向到首頁
    if (isAuthenticated && router.pathname === '/login') {
      router.replace('/');
    }
  }, [isAuthenticated, router, router.pathname]);

  // 如果用戶未登入且不在登入頁面，不顯示內容
  if (!isAuthenticated && router.pathname !== '/login') {
    return null;
  }

  // 如果用戶已登入但正在訪問登入頁面，等待重定向完成
  if (isAuthenticated && router.pathname === '/login') {
    return null;
  }

  return <>{children}</>;
}; 