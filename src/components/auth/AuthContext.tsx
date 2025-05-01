import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CognitoUser, CognitoUserSession } from 'amazon-cognito-identity-js';
import { useCognito } from '@/lib/hooks/useCognito';
import { showError, showInfo } from '@/lib/utils/notification';
import { useRouter } from 'next/router';

type AuthContextType = {
  isAuthenticated: boolean;
  user: CognitoUser | null;
  login: (username: string, password: string) => Promise<{ success: boolean; newPasswordRequired?: boolean }>;
  completeNewPassword: (newPassword: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  getToken: () => Promise<string | null>;
  newPasswordRequired: boolean;
  cancelNewPasswordChallenge: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 自定義Hook來使用AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth必須在AuthProvider內使用');
  }
  return context;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  
  const {
    signIn,
    signOut,
    getCurrentUser,
    getCurrentSession,
    getJwtToken,
    completeNewPassword: cognitoCompleteNewPassword,
    loading: cognitoLoading,
    error: cognitoError,
    newPasswordRequired: cognitoNewPasswordRequired,
    cancelNewPasswordChallenge: cognitoCancelNewPasswordChallenge
  } = useCognito();

  const router = useRouter();

  // 保存令牌到 localStorage
  const saveTokenToStorage = async (session: CognitoUserSession) => {
    try {
      const idToken = session.getIdToken().getJwtToken();
      localStorage.setItem('cognito_id_token', idToken);
      
      // 如果需要，也可以存儲access token和refresh token
      // const accessToken = session.getAccessToken().getJwtToken();
      // localStorage.setItem('cognito_access_token', accessToken);
    } catch (error) {
      console.error('Error saving token to storage:', error);
    }
  };

  // 從 localStorage 清除令牌
  const clearTokenFromStorage = () => {
    localStorage.removeItem('cognito_id_token');
    // localStorage.removeItem('cognito_access_token');
  };

  // 在組件掛載時檢查用戶的身份驗證狀態
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const currentUser = getCurrentUser();
        
        if (currentUser) {
          const session = await getCurrentSession();
          
          if (session && session.isValid()) {
            // 保存令牌
            await saveTokenToStorage(session);
            
            setIsAuthenticated(true);
            setUser(currentUser);
          } else {
            // 如果會話無效，則登出
            handleLogout();
          }
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
        handleLogout();
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuthStatus();
  }, [getCurrentUser, getCurrentSession]);

  // 登入函數
  const handleLogin = async (username: string, password: string): Promise<{ success: boolean; newPasswordRequired?: boolean }> => {
    try {
      const result = await signIn(username, password);
      
      if (result.newPasswordRequired) {
        return { success: false, newPasswordRequired: true };
      }
      
      if (result.success && result.session) {
        // 保存令牌
        await saveTokenToStorage(result.session);
        
        setIsAuthenticated(true);
        setUser(getCurrentUser());
        return { success: true };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false };
    }
  };

  // 完成新密碼設置函數
  const handleCompleteNewPassword = async (newPassword: string): Promise<boolean> => {
    try {
      console.log('AuthContext: 開始處理完成新密碼設置...');
      const result = await cognitoCompleteNewPassword(newPassword);
      
      if (result.success && result.session) {
        console.log('AuthContext: 新密碼設置成功，保存令牌...');
        // 保存令牌
        await saveTokenToStorage(result.session);
        
        setIsAuthenticated(true);
        setUser(getCurrentUser());
        return true;
      }
      
      // 如果設置失敗，但沒有拋出錯誤，顯示通用錯誤訊息
      if (!result.success) {
        console.log('AuthContext: 設置新密碼失敗，但沒有錯誤訊息');
        showError('無法設置新密碼，請重新登入後再試');
        
        // 如果是特定錯誤，清除狀態並重新登入
        setTimeout(() => {
          cognitoCancelNewPasswordChallenge();
          // 重定向到登入頁面
          router.push('/login');
        }, 1500);
      }
      
      return false;
    } catch (error) {
      console.error('AuthContext: 完成新密碼過程中發生錯誤:', error);
      
      // 如果錯誤包含 Session 相關的錯誤，顯示更有指導性的錯誤訊息
      if (error instanceof Error && 
          (error.message.includes('Session') || error.message.includes('會話'))) {
        showError('您的會話已過期。請返回登入頁面，重新登入後再設置新密碼');
        
        // 延遲一秒後跳轉到登入頁面，給用戶時間看到錯誤訊息
        setTimeout(() => {
          // 清除新密碼設置狀態
          cognitoCancelNewPasswordChallenge();
          
          // 使用 window.location 強制刷新到登入頁
          window.location.href = '/login';
        }, 1500);
      } else {
        showError('設置新密碼時發生錯誤: ' + (error instanceof Error ? error.message : '未知錯誤'));
      }
      
      return false;
    }
  };

  // 登出函數
  const handleLogout = () => {
    signOut();
    clearTokenFromStorage();
    setIsAuthenticated(false);
    setUser(null);
  };

  // 獲取 JWT 令牌函數
  const handleGetToken = async (): Promise<string | null> => {
    // 先嘗試從 localStorage 獲取令牌
    const storedToken = localStorage.getItem('cognito_id_token');
    if (storedToken) {
      return storedToken;
    }
    
    // 如果 localStorage 中沒有令牌，則從會話獲取
    const token = await getJwtToken();
    if (token) {
      localStorage.setItem('cognito_id_token', token);
    }
    
    return token;
  };

  // 合併加載狀態
  const loading = authLoading || cognitoLoading;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login: handleLogin,
        completeNewPassword: handleCompleteNewPassword,
        logout: handleLogout,
        loading,
        error: cognitoError,
        getToken: handleGetToken,
        newPasswordRequired: cognitoNewPasswordRequired,
        cancelNewPasswordChallenge: cognitoCancelNewPasswordChallenge
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 