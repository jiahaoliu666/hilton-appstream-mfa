import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AuthContextType = {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // 在組件掛載時檢查本地存儲中的身份驗證狀態
  useEffect(() => {
    const checkAuthStatus = () => {
      const authStatus = localStorage.getItem('isAuthenticated');
      setIsAuthenticated(authStatus === 'true');
    };

    checkAuthStatus();
  }, []);

  // 登入函數
  const login = async (username: string, password: string): Promise<boolean> => {
    // 這裡應該有實際的API認證邏輯
    // 目前只是簡單模擬，實際應用中需要替換
    
    if (username && password) {
      // 模擬成功登入
      setIsAuthenticated(true);
      localStorage.setItem('isAuthenticated', 'true');
      return true;
    }
    
    return false;
  };

  // 登出函數
  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 自定義Hook來使用AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth必須在AuthProvider內使用');
  }
  return context;
}; 