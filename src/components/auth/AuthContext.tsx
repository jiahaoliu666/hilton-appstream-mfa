import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CognitoUser, CognitoUserSession } from 'amazon-cognito-identity-js';
import { useCognito } from '@/lib/hooks/useCognito';

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
      const result = await cognitoCompleteNewPassword(newPassword);
      
      if (result.success && result.session) {
        // 保存令牌
        await saveTokenToStorage(result.session);
        
        setIsAuthenticated(true);
        setUser(getCurrentUser());
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Complete new password error:', error);
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