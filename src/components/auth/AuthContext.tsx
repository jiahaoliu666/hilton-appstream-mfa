import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CognitoUser, CognitoUserSession } from 'amazon-cognito-identity-js';
import { useCognito, MFAType } from '@/lib/hooks/useCognito';
import { showError, showInfo, showSuccess } from '@/lib/utils/notification';
import { useRouter } from 'next/router';
import { SetupStep } from '@/components/common/SetupProgressIndicator';

type AuthContextType = {
  isAuthenticated: boolean;
  user: CognitoUser | null;
  login: (username: string, password: string) => Promise<{ 
    success: boolean; 
    newPasswordRequired?: boolean;
    mfaRequired?: boolean;
    mfaType?: MFAType;
    availableMfaTypes?: any[];
  }>;
  completeNewPassword: (newPassword: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  getToken: () => Promise<string | null>;
  newPasswordRequired: boolean;
  cancelNewPasswordChallenge: () => void;
  // MFA 相關
  mfaRequired: boolean;
  mfaType: MFAType;
  verifyMfaCode: (mfaCode: string) => Promise<boolean>;
  selectMfaType: (mfaType: MFAType) => Promise<boolean>;
  getUserMfaSettings: () => Promise<{
    success: boolean;
    preferredMfa?: string;
    mfaOptions?: any[];
    enabled?: boolean;
  }>;
  setupTotpMfa: () => Promise<{
    success: boolean;
    secretCode?: string;
    qrCodeUrl?: string;
  }>;
  verifyAndEnableTotpMfa: (totpCode: string, deviceName?: string) => Promise<boolean>;
  setupSmsMfa: () => Promise<boolean>;
  disableMfa: () => Promise<boolean>;
  mfaSecret: string;
  mfaSecretQRCode: string;
  // 安全設置進度指示相關
  isFirstLogin: boolean;
  setIsFirstLogin: (isFirst: boolean) => void;
  currentSetupStep: SetupStep;
  setCurrentSetupStep: (step: SetupStep) => void;
  isMfaSetupRequired: boolean;
  setIsMfaSetupRequired: (required: boolean) => void;
  completeSetup: () => void;
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
  // 首次登入與安全設置進度相關狀態
  const [isFirstLogin, setIsFirstLogin] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cognito_first_login') === 'true';
    }
    return false;
  });
  const [currentSetupStep, setCurrentSetupStep] = useState<SetupStep>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('cognito_setup_step') as SetupStep) || 'password';
    }
    return 'password';
  });
  const [isMfaSetupRequired, setIsMfaSetupRequired] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cognito_mfa_setup_required') !== 'false';
    }
    return true; // 預設值為true，表示需要設置MFA
  });
  
  // 新增一個MFA已啟用的狀態，緩存MFA狀態避免頻繁API調用
  const [isMfaEnabled, setIsMfaEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cognito_mfa_enabled') === 'true';
    }
    return false;
  });
  
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
    cancelNewPasswordChallenge: cognitoCancelNewPasswordChallenge,
    // MFA 相關
    mfaRequired: cognitoMfaRequired,
    mfaType: cognitoMfaType,
    verifyMfaCode: cognitoVerifyMfaCode,
    selectMfaType: cognitoSelectMfaType,
    getUserMfaSettings: cognitoGetUserMfaSettings,
    setupTotpMfa: cognitoSetupTotpMfa,
    verifyAndEnableTotpMfa: cognitoVerifyAndEnableTotpMfa,
    setupSmsMfa: cognitoSetupSmsMfa,
    disableMfa: cognitoDisableMfa,
    mfaSecret: cognitoMfaSecret,
    mfaSecretQRCode: cognitoMfaSecretQRCode
  } = useCognito();

  const router = useRouter();

  // 更新安全設置進度
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cognito_first_login', isFirstLogin.toString());
      localStorage.setItem('cognito_setup_step', currentSetupStep);
      localStorage.setItem('cognito_mfa_setup_required', isMfaSetupRequired.toString());
    }
  }, [isFirstLogin, currentSetupStep, isMfaSetupRequired]);

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

  // 在組件掛載時檢查用戶的身份驗證狀態和MFA設置
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
            
            // 檢查MFA設置狀態
            handleGetUserMfaSettings().catch(console.error);
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
  const handleLogin = async (username: string, password: string): Promise<{ 
    success: boolean; 
    newPasswordRequired?: boolean;
    mfaRequired?: boolean;
    mfaType?: MFAType;
    availableMfaTypes?: any[];
  }> => {
    try {
      // 在開始新的登入前，清除可能存在的設置狀態，避免狀態不一致
      if (typeof window !== 'undefined') {
        // 除非明確需要設置新密碼，否則清除相關標記
        if (!cognitoNewPasswordRequired) {
          localStorage.removeItem('cognito_new_password_required');
        }
        // 清除潛在的衝突狀態
        if (!isFirstLogin) {
          localStorage.removeItem('cognito_first_login');
          localStorage.removeItem('cognito_setup_step');
        }
      }

      const result = await signIn(username, password);
      
      if (result.mfaRequired) {
        // 如果需要 MFA 驗證，返回相關信息
        return { 
          success: false, 
          mfaRequired: true, 
          mfaType: result.mfaType, 
          availableMfaTypes: result.availableMfaTypes
        };
      }
      
      if (result.newPasswordRequired) {
        // 標記為首次登入，需要設置新密碼
        setIsFirstLogin(true);
        setCurrentSetupStep('password');
        if (typeof window !== 'undefined') {
          localStorage.setItem('cognito_first_login', 'true');
          localStorage.setItem('cognito_setup_step', 'password');
          // 明確設置需要新密碼的標記
          localStorage.setItem('cognito_new_password_required', 'true');
        }
        return { success: false, newPasswordRequired: true };
      }
      
      if (result.success && result.session) {
        // 保存令牌
        await saveTokenToStorage(result.session);
        
        setIsAuthenticated(true);
        setUser(getCurrentUser());
        
        // 檢查是否有未完成的設置流程
        const savedFirstLogin = typeof window !== 'undefined' ? 
          localStorage.getItem('cognito_first_login') === 'true' : false;
        const savedSetupStep = typeof window !== 'undefined' ? 
          localStorage.getItem('cognito_setup_step') as SetupStep : null;
          
        // 如果本地儲存有未完成的設置流程
        if (savedFirstLogin && savedSetupStep && savedSetupStep !== 'complete') {
          console.log('檢測到未完成的設置流程:', savedSetupStep);
          
          // 恢復設置狀態
          setIsFirstLogin(true);
          setCurrentSetupStep(savedSetupStep);
          
          // 如果未完成的是 MFA 設置
          if (savedSetupStep === 'mfa') {
            const isMfaRequired = typeof window !== 'undefined' ? 
              localStorage.getItem('cognito_mfa_setup_required') !== 'false' : true;
            setIsMfaSetupRequired(isMfaRequired);
          }
        } 
        // 如果沒有未完成的設置流程，但狀態中還有設置標記，進行清理
        else if (isFirstLogin) {
          setIsFirstLogin(false);
          setCurrentSetupStep('complete');
          if (typeof window !== 'undefined') {
            localStorage.setItem('cognito_first_login', 'false');
            localStorage.setItem('cognito_setup_step', 'complete');
          }
        }
        
        // 檢查是否是首次登入流程，如果是，且已完成密碼設置，更新到MFA階段
        if (isFirstLogin && currentSetupStep === 'password') {
          setCurrentSetupStep('mfa');
          if (typeof window !== 'undefined') {
            localStorage.setItem('cognito_setup_step', 'mfa');
            // 清除需要新密碼的標記，因為密碼已設置
            localStorage.removeItem('cognito_new_password_required');
          }
        }
        
        return { success: true };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false };
    }
  };

  // 完成安全設置流程
  const completeSetup = () => {
    setIsFirstLogin(false);
    setCurrentSetupStep('complete');
    if (typeof window !== 'undefined') {
      localStorage.setItem('cognito_first_login', 'false');
      localStorage.setItem('cognito_setup_step', 'complete');
    }
  };

  // 驗證 MFA 碼
  const handleVerifyMfaCode = async (mfaCode: string): Promise<boolean> => {
    try {
      const result = await cognitoVerifyMfaCode(mfaCode);
      
      if (result.success && result.session) {
        // 保存令牌
        await saveTokenToStorage(result.session);
        
        setIsAuthenticated(true);
        setUser(getCurrentUser());
        
        // 如果是首次登入流程，且已完成MFA設置
        if (isFirstLogin && currentSetupStep === 'mfa') {
          completeSetup();
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('MFA verification error:', error);
      return false;
    }
  };

  // 選擇 MFA 類型
  const handleSelectMfaType = async (mfaType: MFAType): Promise<boolean> => {
    try {
      const result = await cognitoSelectMfaType(mfaType);
      
      if (result.success && result.session) {
        // 如果選擇 MFA 類型後直接返回了會話，保存令牌
        await saveTokenToStorage(result.session);
        
        setIsAuthenticated(true);
        setUser(getCurrentUser());
        
        // 如果是首次登入流程，且已完成MFA設置
        if (isFirstLogin && currentSetupStep === 'mfa') {
          completeSetup();
        }
        
        return true;
      }
      
      return result.success;
    } catch (error) {
      console.error('Select MFA type error:', error);
      return false;
    }
  };

  // 獲取用戶 MFA 設置
  const handleGetUserMfaSettings = async () => {
    try {
      const result = await cognitoGetUserMfaSettings();
      
      // 如果成功獲取MFA設置，更新本地狀態和存儲
      if (result.success) {
        const isEnabled = result.enabled || false;
        setIsMfaEnabled(isEnabled);
        
        // 同步到localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('cognito_mfa_enabled', isEnabled.toString());
        }
      }
      
      return result;
    } catch (error) {
      console.error('Get MFA settings error:', error);
      return { success: false };
    }
  };

  // 設置 TOTP MFA
  const handleSetupTotpMfa = async () => {
    try {
      return await cognitoSetupTotpMfa();
    } catch (error) {
      console.error('Setup TOTP MFA error:', error);
      return { success: false };
    }
  };

  // 驗證並啟用 TOTP MFA
  const handleVerifyAndEnableTotpMfa = async (totpCode: string, deviceName?: string): Promise<boolean> => {
    try {
      const result = await cognitoVerifyAndEnableTotpMfa(totpCode, deviceName);
      
      if (result.success) {
        // 更新MFA啟用狀態
        setIsMfaEnabled(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('cognito_mfa_enabled', 'true');
        }
      
        // 如果是首次登入流程，且已完成MFA設置
        if (isFirstLogin && currentSetupStep === 'mfa') {
          completeSetup();
        }
      }
      
      return result.success;
    } catch (error) {
      console.error('Verify and enable TOTP MFA error:', error);
      return false;
    }
  };

  // 設置 SMS MFA
  const handleSetupSmsMfa = async (): Promise<boolean> => {
    try {
      const result = await cognitoSetupSmsMfa();
      
      if (result.success) {
        // 更新MFA啟用狀態
        setIsMfaEnabled(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('cognito_mfa_enabled', 'true');
        }
        
        // 如果是首次登入流程，且已完成MFA設置
        if (isFirstLogin && currentSetupStep === 'mfa') {
          completeSetup();
        }
      }
      
      return result.success;
    } catch (error) {
      console.error('Setup SMS MFA error:', error);
      return false;
    }
  };

  // 禁用 MFA
  const handleDisableMfa = async (): Promise<boolean> => {
    try {
      const result = await cognitoDisableMfa();
      
      if (result.success) {
        // 更新MFA禁用狀態
        setIsMfaEnabled(false);
        if (typeof window !== 'undefined') {
          localStorage.setItem('cognito_mfa_enabled', 'false');
        }
      }
      
      return result.success;
    } catch (error) {
      console.error('Disable MFA error:', error);
      return false;
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
        
        // 清除需要新密碼的標記
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cognito_new_password_required');
          localStorage.removeItem('cognito_password');
        }
        
        // 如果是首次登入流程，且設置了新密碼，更新進度到MFA設置階段
        if (isFirstLogin && currentSetupStep === 'password') {
          if (isMfaSetupRequired) {
            setCurrentSetupStep('mfa');
            if (typeof window !== 'undefined') {
              localStorage.setItem('cognito_setup_step', 'mfa');
            }
          } else {
            completeSetup();
          }
          
          // 立即檢查MFA設置狀態
          handleGetUserMfaSettings().catch(console.error);
        }
        
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
      
      // 檢查是否是 MFA 相關的錯誤
      if (error instanceof Error) {
        if (error.message.includes('MFA') || error.message.includes('多因素認證')) {
          showInfo('您需要設置多因素認證 (MFA)，即將跳轉到 MFA 設置頁面');
          
          // 轉到 MFA 設置頁面
          if (isFirstLogin && currentSetupStep === 'password') {
            setCurrentSetupStep('mfa');
            if (typeof window !== 'undefined') {
              localStorage.setItem('cognito_setup_step', 'mfa');
              // 清除需要新密碼的標記，因為密碼已設置
              localStorage.removeItem('cognito_new_password_required');
              localStorage.removeItem('cognito_password');
            }
          }
          
          // 延遲一秒後跳轉到 MFA 設置頁面
          setTimeout(() => {
            router.push('/mfa-setup');
          }, 1500);
          
          return true; // 密碼已設置成功，只是需要繼續設置 MFA
        }
      
        // 如果錯誤包含 Session 相關的錯誤，顯示更有指導性的錯誤訊息
        if (error.message.includes('Session') || error.message.includes('會話')) {
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
      }
      
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  // 登出函數
  const handleLogout = () => {
    signOut();
    clearTokenFromStorage();
    setIsAuthenticated(false);
    setUser(null);
    
    // 清除所有狀態
    setIsFirstLogin(false);
    setCurrentSetupStep('password');
    setIsMfaEnabled(false);
    
    if (typeof window !== 'undefined') {
      // 清除所有相關localStorage項
      localStorage.removeItem('cognito_first_login');
      localStorage.removeItem('cognito_setup_step');
      localStorage.removeItem('cognito_new_password_required');
      localStorage.removeItem('cognito_username');
      localStorage.removeItem('cognito_challenge_session');
      localStorage.removeItem('cognito_mfa_required');
      localStorage.removeItem('cognito_mfa_type');
      localStorage.removeItem('cognito_mfa_enabled');
      localStorage.removeItem('cognito_mfa_options');
    }
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
        cancelNewPasswordChallenge: cognitoCancelNewPasswordChallenge,
        // MFA 相關
        mfaRequired: cognitoMfaRequired,
        mfaType: cognitoMfaType,
        verifyMfaCode: handleVerifyMfaCode,
        selectMfaType: handleSelectMfaType,
        getUserMfaSettings: handleGetUserMfaSettings,
        setupTotpMfa: handleSetupTotpMfa,
        verifyAndEnableTotpMfa: handleVerifyAndEnableTotpMfa,
        setupSmsMfa: handleSetupSmsMfa,
        disableMfa: handleDisableMfa,
        mfaSecret: cognitoMfaSecret,
        mfaSecretQRCode: cognitoMfaSecretQRCode,
        // 安全設置進度相關
        isFirstLogin,
        setIsFirstLogin,
        currentSetupStep,
        setCurrentSetupStep,
        isMfaSetupRequired,
        setIsMfaSetupRequired,
        completeSetup
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 