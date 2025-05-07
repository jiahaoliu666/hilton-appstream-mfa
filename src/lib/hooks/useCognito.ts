import { useState, useCallback, useEffect } from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
  CognitoUserAttribute,
  MFAOption
} from 'amazon-cognito-identity-js';
import { cognitoConfig } from '@/lib/config/cognito';
import { showError, showSuccess, mapCognitoErrorToMessage } from '@/lib/utils/notification';

// 創建用戶池實例
const userPool = new CognitoUserPool({
  UserPoolId: cognitoConfig.userPoolId,
  ClientId: cognitoConfig.clientId
});

type CognitoError = {
  code: string;
  name: string;
  message: string;
};

// MFA 類型
export type MFAType = 'SMS_MFA' | 'SOFTWARE_TOKEN_MFA' | 'SELECT_MFA_TYPE' | 'NOMFA';

export const useCognito = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newPasswordRequired, setNewPasswordRequired] = useState<boolean>(() => {
    // 檢查 localStorage 中是否有設置需要新密碼的標記
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cognito_new_password_required') === 'true';
    }
    return false;
  });
  const [currentCognitoUser, setCurrentCognitoUser] = useState<CognitoUser | null>(null);
  const [userAttributes, setUserAttributes] = useState<any>(null);
  const [mfaType, setMfaType] = useState<MFAType>('NOMFA');
  const [mfaRequired, setMfaRequired] = useState<boolean>(false);
  const [mfaSecret, setMfaSecret] = useState<string>('');
  const [mfaSecretQRCode, setMfaSecretQRCode] = useState<string>('');

  // 清除 MFA 相關狀態
  const clearMfaState = useCallback(() => {
    setMfaType('NOMFA');
    setMfaRequired(false);
    setMfaSecret('');
    setMfaSecretQRCode('');
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cognito_mfa_required');
      localStorage.removeItem('cognito_mfa_type');
    }
  }, []);

  // 登入
  const signIn = useCallback(async (username: string, password: string): Promise<{ 
    success: boolean; 
    session?: CognitoUserSession; 
    newPasswordRequired?: boolean;
    mfaRequired?: boolean;
    mfaType?: MFAType;
    availableMfaTypes?: any[];
  }> => {
    setLoading(true);
    setError(null);
    setNewPasswordRequired(false);
    clearMfaState();
    
    // 清除先前的標記
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cognito_new_password_required');
      localStorage.removeItem('cognito_username');
      localStorage.removeItem('cognito_challenge_session');
      localStorage.removeItem('cognito_auth_details');
    }

    try {
      const authenticationDetails = new AuthenticationDetails({
        Username: username,
        Password: password
      });

      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: userPool
      });

      // 保存身份驗證詳情，用於後續恢復
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('cognito_auth_details', JSON.stringify({
            username,
            // 出於安全考慮，不存儲密碼
          }));
          localStorage.setItem('cognito_username', username);
        } catch (e) {
          console.error('無法保存身份驗證詳情', e);
        }
      }

      setCurrentCognitoUser(cognitoUser);

      // 進行身份驗證
      const result = await new Promise<any>((resolve, reject) => {
        cognitoUser.authenticateUser(authenticationDetails, {
          onSuccess: (session) => {
            resolve({ session, newPasswordRequired: false, mfaRequired: false });
          },
          onFailure: (err) => {
            reject(err);
          },
          newPasswordRequired: (userAttributes, requiredAttributes) => {
            // 處理首次登入需要更改密碼的情況
            setUserAttributes(userAttributes);
            setNewPasswordRequired(true);
            
            // 在 localStorage 中保存需要新密碼的標記
            if (typeof window !== 'undefined') {
              localStorage.setItem('cognito_new_password_required', 'true');
              localStorage.setItem('cognito_password', password); // 暫時存儲密碼用於會話恢復
              
              // 保存挑戰名稱和會話狀態
              localStorage.setItem('cognito_challenge_session', JSON.stringify({
                challengeName: 'NEW_PASSWORD_REQUIRED',
                authenticationFlowType: cognitoUser.getAuthenticationFlowType()
              }));
            }
            
            resolve({ newPasswordRequired: true, userAttributes, requiredAttributes });
          },
          mfaRequired: (challengeName, challengeParameters) => {
            // 處理 SMS MFA 挑戰
            console.log('SMS MFA 挑戰', challengeName);
            setMfaType('SMS_MFA');
            setMfaRequired(true);
            
            if (typeof window !== 'undefined') {
              localStorage.setItem('cognito_mfa_required', 'true');
              localStorage.setItem('cognito_mfa_type', 'SMS_MFA');
              localStorage.setItem('cognito_password', password); // 暫時存儲密碼用於 MFA 失敗後重試
            }
            
            resolve({ mfaRequired: true, mfaType: 'SMS_MFA' });
          },
          totpRequired: (challengeName, challengeParameters) => {
            // 處理 TOTP MFA 挑戰
            console.log('TOTP MFA 挑戰', challengeName);
            setMfaType('SOFTWARE_TOKEN_MFA');
            setMfaRequired(true);
            
            if (typeof window !== 'undefined') {
              localStorage.setItem('cognito_mfa_required', 'true');
              localStorage.setItem('cognito_mfa_type', 'SOFTWARE_TOKEN_MFA');
              localStorage.setItem('cognito_password', password); // 暫時存儲密碼用於 MFA 失敗後重試
            }
            
            resolve({ mfaRequired: true, mfaType: 'SOFTWARE_TOKEN_MFA' });
          },
          selectMFAType: (challengeName, challengeParameters) => {
            // 處理需要選擇 MFA 類型的情況
            console.log('需要選擇 MFA 類型', challengeName);
            setMfaType('SELECT_MFA_TYPE');
            setMfaRequired(true);
            
            if (typeof window !== 'undefined') {
              localStorage.setItem('cognito_mfa_required', 'true');
              localStorage.setItem('cognito_mfa_type', 'SELECT_MFA_TYPE');
              localStorage.setItem('cognito_password', password); // 暫時存儲密碼用於 MFA 失敗後重試
            }
            
            resolve({ 
              mfaRequired: true, 
              mfaType: 'SELECT_MFA_TYPE',
              availableMfaTypes: challengeParameters.mfaOptions || [] 
            });
          }
        });
      });

      if (result.newPasswordRequired) {
        return { success: false, newPasswordRequired: true };
      }

      if (result.mfaRequired) {
        return { 
          success: false, 
          mfaRequired: true, 
          mfaType: result.mfaType,
          availableMfaTypes: result.availableMfaTypes
        };
      }

      showSuccess('登入成功');
      return { success: true, session: result.session };
    } catch (err) {
      const cognitoError = err as CognitoError;
      let errorMessage = '登入失敗';

      // 添加錯誤日誌以便調試
      console.log('Cognito Error:', {
        code: cognitoError.code,
        name: cognitoError.name,
        message: cognitoError.message
      });

      // 處理常見的 Cognito 錯誤
      if (cognitoError.name === 'UserNotFoundException' || 
          cognitoError.message?.includes('User does not exist')) {
        errorMessage = '請確認電子郵件或密碼是否正確';
      } else if (cognitoError.name === 'NotAuthorizedException' || 
                 cognitoError.message?.includes('Incorrect username or password')) {
        // Cognito出於安全考量，將未註冊用戶和密碼錯誤返回相同的錯誤代碼
        errorMessage = '請確認電子郵件或密碼是否正確';
      } else if (cognitoError.name === 'ResourceNotFoundException' || 
                 cognitoError.code === 'ResourceNotFoundException' ||
                 cognitoError.message?.includes('User pool client') && 
                 cognitoError.message?.includes('does not exist')) {
        errorMessage = '認證服務未正確設置，請聯繫系統管理員';
      } else if (cognitoError.name === 'UserNotConfirmedException') {
        errorMessage = '用戶尚未確認';
      } else {
        errorMessage = cognitoError.message || '登入過程發生錯誤';
      }

      setError(errorMessage);
      showError(errorMessage);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [clearMfaState]);

  // 驗證 MFA 碼
  const verifyMfaCode = useCallback(async (mfaCode: string, mfaType?: MFAType): Promise<{
    success: boolean;
    session?: CognitoUserSession;
  }> => {
    setLoading(true);
    setError(null);

    try {
      const user = currentCognitoUser;
      if (!user) {
        throw new Error('用戶會話已失效，請重新登入');
      }

      const selectedMfaType = mfaType || (typeof window !== 'undefined' ? 
        localStorage.getItem('cognito_mfa_type') as MFAType || 'SMS_MFA' : 'SMS_MFA');

      const session = await new Promise<CognitoUserSession>((resolve, reject) => {
        user.sendMFACode(mfaCode, {
          onSuccess: (session) => {
            resolve(session);
          },
          onFailure: (err) => {
            reject(err);
          }
        }, selectedMfaType);
      });

      // 清除 MFA 相關狀態和臨時密碼
      clearMfaState();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cognito_password');
      }

      showSuccess('驗證成功');
      return { success: true, session };
    } catch (err) {
      const cognitoError = err as CognitoError;
      let errorMessage = '驗證碼錯誤或已過期';

      if (cognitoError.name === 'NotAuthorizedException') {
        errorMessage = '驗證碼錯誤或已過期';
      } else if (cognitoError.name === 'CodeMismatchException') {
        errorMessage = '驗證碼不匹配，請重新輸入';
      } else {
        errorMessage = cognitoError.message || '驗證過程發生錯誤';
      }

      setError(errorMessage);
      showError(errorMessage);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [currentCognitoUser, clearMfaState]);

  // 選擇 MFA 類型 (當用戶有多種 MFA 選項時)
  const selectMfaType = useCallback(async (mfaType: MFAType): Promise<{
    success: boolean;
    session?: CognitoUserSession;
  }> => {
    setLoading(true);
    setError(null);

    try {
      const user = currentCognitoUser;
      if (!user) {
        throw new Error('用戶會話已失效，請重新登入');
      }

      // 更新 localStorage 中的 MFA 類型
      if (typeof window !== 'undefined') {
        localStorage.setItem('cognito_mfa_type', mfaType);
      }

      const result = await new Promise<any>((resolve, reject) => {
        user.sendMFASelectionAnswer(mfaType === 'SMS_MFA' ? 'SMS_MFA' : 'SOFTWARE_TOKEN_MFA', {
          onSuccess: (session) => {
            resolve({ success: true, session });
          },
          onFailure: (err) => {
            reject(err);
          },
          mfaRequired: (challengeName, challengeParameters) => {
            // 成功選擇了 SMS MFA
            setMfaType('SMS_MFA');
            resolve({ success: true, mfaType: 'SMS_MFA' });
          },
          totpRequired: (challengeName, challengeParameters) => {
            // 成功選擇了 TOTP MFA
            setMfaType('SOFTWARE_TOKEN_MFA');
            resolve({ success: true, mfaType: 'SOFTWARE_TOKEN_MFA' });
          }
        });
      });

      // 如果直接返回了會話，說明驗證已完成
      if (result.session) {
        clearMfaState();
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cognito_password');
        }
        showSuccess('登入成功');
        return { success: true, session: result.session };
      }

      // 否則，更新 MFA 類型，等待用戶輸入驗證碼
      setMfaType(result.mfaType);
      return { success: true };
    } catch (err) {
      const cognitoError = err as CognitoError;
      let errorMessage = '選擇 MFA 類型時發生錯誤';

      setError(errorMessage);
      showError(errorMessage);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [currentCognitoUser, clearMfaState]);

  // 完成新密碼設置
  const completeNewPassword = useCallback(async (newPassword: string): Promise<{ success: boolean; session?: CognitoUserSession }> => {
    setLoading(true);
    setError(null);

    try {
      // 嘗試使用儲存的用戶信息和密碼重新進行身份驗證
      // 這樣可以獲得一個有效的會話狀態
      const username = localStorage.getItem('cognito_username');
      const password = localStorage.getItem('cognito_password');
      let userToComplete = currentCognitoUser;

      if (!username || !userToComplete) {
        throw new Error('會話已過期，請重新登入後再設置新密碼');
      }

      // 如果需要重新認證，使用儲存的密碼和用戶名
      if (!userToComplete.getSignInUserSession() && password) {
        try {
          console.log('嘗試重新進行身份驗證獲取新會話...');
          
          const authenticationDetails = new AuthenticationDetails({
            Username: username,
            Password: password
          });

          const newCognitoUser = new CognitoUser({
            Username: username,
            Pool: userPool
          });

          // 重新進行身份驗證，確保有新的有效會話
          await new Promise<void>((resolve, reject) => {
            newCognitoUser.authenticateUser(authenticationDetails, {
              onSuccess: () => {
                reject(new Error('用戶已經成功登入，不需要再設置新密碼'));
              },
              onFailure: (err) => {
                reject(err);
              },
              newPasswordRequired: (userAttrs) => {
                // 更新為新的用戶實例
                userToComplete = newCognitoUser;
                setCurrentCognitoUser(newCognitoUser);
                resolve();
              }
            });
          });
        } catch (authError: any) {
          console.error('重新認證失敗:', authError);
          
          if (authError.message === '用戶已經成功登入，不需要再設置新密碼') {
            // 用戶可能在其他標籤頁已完成密碼設置，可以直接重定向到首頁
            setNewPasswordRequired(false);
            
            // 清除需要新密碼的標記
            if (typeof window !== 'undefined') {
              localStorage.removeItem('cognito_new_password_required');
              localStorage.removeItem('cognito_username');
              localStorage.removeItem('cognito_password');
              localStorage.removeItem('cognito_challenge_session');
            }
            
            return { success: true };
          }
          
          throw new Error('無法恢復會話，請重新登入: ' + authError.message);
        }
      }

      // 設置新密碼
      console.log('開始完成新密碼設置...');
      const session = await new Promise<CognitoUserSession>((resolve, reject) => {
        // 過濾不需要的屬性，以避免 Cognito API 的錯誤
        const filteredAttributes: any = {};
        
        userToComplete!.completeNewPasswordChallenge(newPassword, filteredAttributes, {
          onSuccess: (session) => {
            console.log('新密碼設置成功');
            resolve(session);
          },
          onFailure: (err) => {
            console.error('新密碼設置失敗:', err);
            reject(err);
          }
        });
      });

      setNewPasswordRequired(false);
      setCurrentCognitoUser(null);
      setUserAttributes(null);
      
      // 清除需要新密碼的標記，特別注意要清除密碼
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cognito_new_password_required');
        localStorage.removeItem('cognito_username');
        localStorage.removeItem('cognito_password'); // 重要：清除密碼
        localStorage.removeItem('cognito_challenge_session');
      }
      
      showSuccess('密碼設置成功，即將跳轉到首頁');
      return { success: true, session };
    } catch (err) {
      const cognitoError = err as CognitoError;
      let errorMessage = '設置新密碼過程發生錯誤';
      
      if (cognitoError.message) {
        if (cognitoError.message.includes('Invalid session')) {
          errorMessage = '會話無效，請重新登入後再設置新密碼';
        } else if (cognitoError.message.includes('Password does not conform')) {
          errorMessage = '密碼不符合安全要求，請確保符合所有條件';
        } else {
          errorMessage = cognitoError.message;
        }
      }
      
      setError(errorMessage);
      showError(errorMessage);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [currentCognitoUser]);

  // 登出
  const signOut = useCallback(() => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
      
      // 清除需要新密碼的標記
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cognito_new_password_required');
        localStorage.removeItem('cognito_username');
        localStorage.removeItem('cognito_challenge_session');
      }
      
      showSuccess('已成功登出');
    }
  }, []);

  // 專門用於從 change-password 頁面取消並返回登入頁面
  const cancelNewPasswordChallenge = useCallback(() => {
    // 清除當前用戶狀態
    setCurrentCognitoUser(null);
    setUserAttributes(null);
    setNewPasswordRequired(false);
    
    // 清除需要新密碼的標記
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cognito_new_password_required');
      localStorage.removeItem('cognito_username');
      localStorage.removeItem('cognito_challenge_session');
    }
  }, []);

  // 獲取當前會話
  const getCurrentSession = useCallback(async (): Promise<CognitoUserSession | null> => {
    const currentUser = userPool.getCurrentUser();
    if (!currentUser) return null;

    try {
      const session = await new Promise<CognitoUserSession>((resolve, reject) => {
        currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
          if (err) {
            reject(err);
            return;
          }
          if (session) {
            resolve(session);
          } else {
            reject(new Error('No session found'));
          }
        });
      });
      
      return session;
    } catch (err) {
      console.error('Error getting current session:', err);
      return null;
    }
  }, []);

  // 獲取當前用戶
  const getCurrentUser = useCallback(() => {
    return userPool.getCurrentUser();
  }, []);

  // 獲取JWT令牌
  const getJwtToken = useCallback(async (): Promise<string | null> => {
    try {
      const session = await getCurrentSession();
      return session?.getIdToken().getJwtToken() || null;
    } catch (err) {
      console.error('Error getting JWT token:', err);
      return null;
    }
  }, [getCurrentSession]);

  // 註冊新用戶
  const signUp = useCallback(async (
    username: string,
    password: string,
    email: string,
    attributes?: Record<string, string>
  ): Promise<{ success: boolean; result?: any }> => {
    setLoading(true);
    setError(null);

    try {
      const attributeList = [
        new CognitoUserAttribute({
          Name: 'email',
          Value: email
        })
      ];

      // 添加其他屬性
      if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
          attributeList.push(new CognitoUserAttribute({
            Name: key,
            Value: value
          }));
        });
      }

      const result = await new Promise<any>((resolve, reject) => {
        userPool.signUp(username, password, attributeList, [], (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(result);
        });
      });

      showSuccess('註冊成功，請檢查您的郵箱進行確認');
      return { success: true, result };
    } catch (err) {
      const cognitoError = err as CognitoError;
      let errorMessage = '註冊失敗';

      // 處理常見的註冊錯誤
      if (cognitoError.code) {
        errorMessage = mapCognitoErrorToMessage(cognitoError.code);
      } else {
        errorMessage = cognitoError.message || '註冊過程發生錯誤';
      }

      setError(errorMessage);
      showError(errorMessage);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // 重置密碼
  const forgotPassword = useCallback(async (username: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: userPool
      });

      await new Promise<void>((resolve, reject) => {
        cognitoUser.forgotPassword({
          onSuccess: () => {
            resolve();
          },
          onFailure: (err) => {
            reject(err);
          }
        });
      });

      showSuccess('重置密碼的驗證碼已發送到您的郵箱');
      return true;
    } catch (err) {
      const cognitoError = err as CognitoError;
      const errorMessage = cognitoError.code 
        ? mapCognitoErrorToMessage(cognitoError.code) 
        : (cognitoError.message || '重置密碼過程發生錯誤');
      
      setError(errorMessage);
      showError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 確認重置密碼
  const confirmNewPassword = useCallback(async (
    username: string,
    verificationCode: string,
    newPassword: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: userPool
      });

      await new Promise<void>((resolve, reject) => {
        cognitoUser.confirmPassword(verificationCode, newPassword, {
          onSuccess: () => {
            resolve();
          },
          onFailure: (err) => {
            reject(err);
          }
        });
      });

      showSuccess('密碼重置成功，請使用新密碼登入');
      return true;
    } catch (err) {
      const cognitoError = err as CognitoError;
      const errorMessage = cognitoError.code 
        ? mapCognitoErrorToMessage(cognitoError.code) 
        : (cognitoError.message || '確認新密碼過程發生錯誤');
      
      setError(errorMessage);
      showError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 取得用戶 MFA 配置
  const getUserMfaSettings = useCallback(async (): Promise<{
    success: boolean;
    preferredMfa?: string;
    mfaOptions?: MFAOption[];
    enabled?: boolean;
  }> => {
    setLoading(true);
    setError(null);

    try {
      const user = userPool.getCurrentUser();
      if (!user) {
        throw new Error('用戶未登入');
      }

      // 獲取 MFA 選項
      const mfaOptions = await new Promise<MFAOption[]>((resolve, reject) => {
        user.getMFAOptions((err, result) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(result || []);
        });
      });

      // 獲取用戶數據，包含首選 MFA 方式
      const userData = await new Promise<any>((resolve, reject) => {
        user.getUserData((err, data) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(data);
        });
      });

      const preferredMfa = userData.PreferredMfaSetting || '';
      const mfaEnabled = !!preferredMfa || mfaOptions.length > 0;

      return { 
        success: true, 
        preferredMfa, 
        mfaOptions, 
        enabled: mfaEnabled 
      };
    } catch (err) {
      const cognitoError = err as CognitoError;
      let errorMessage = '獲取 MFA 設置失敗';

      setError(errorMessage);
      showError(errorMessage);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // 設置 TOTP MFA
  const setupTotpMfa = useCallback(async (): Promise<{
    success: boolean;
    secretCode?: string;
    qrCodeUrl?: string;
  }> => {
    setLoading(true);
    setError(null);

    try {
      const user = userPool.getCurrentUser();
      if (!user) {
        throw new Error('用戶未登入');
      }

      // 關聯軟件令牌 (獲取 secret code)
      const secretCode = await new Promise<string>((resolve, reject) => {
        user.associateSoftwareToken({
          associateSecretCode: (secretCode) => {
            resolve(secretCode);
          },
          onFailure: (err) => {
            reject(err);
          }
        });
      });

      // 生成 QR 碼 URL
      // 使用 otpauth URL 格式: otpauth://totp/[服務名稱]:[用戶名]?secret=[密鑰]&issuer=[服務名稱]
      const username = user.getUsername();
      const appName = cognitoConfig.appName || 'Hilton AppStream';
      const qrCodeUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(username)}?secret=${secretCode}&issuer=${encodeURIComponent(appName)}`;

      // 保存密鑰和 QR 碼 URL 到狀態
      setMfaSecret(secretCode);
      setMfaSecretQRCode(qrCodeUrl);

      return { 
        success: true, 
        secretCode, 
        qrCodeUrl 
      };
    } catch (err) {
      const cognitoError = err as CognitoError;
      let errorMessage = '設置 TOTP MFA 失敗';

      setError(errorMessage);
      showError(errorMessage);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // 驗證並啟用 TOTP MFA
  const verifyAndEnableTotpMfa = useCallback(async (
    totpCode: string, 
    deviceName: string = '我的驗證器'
  ): Promise<{
    success: boolean;
  }> => {
    setLoading(true);
    setError(null);

    try {
      const user = userPool.getCurrentUser();
      if (!user) {
        throw new Error('用戶未登入');
      }

      // 驗證 TOTP 碼
      await new Promise<void>((resolve, reject) => {
        user.verifySoftwareToken(totpCode, deviceName, {
          onSuccess: () => {
            resolve();
          },
          onFailure: (err) => {
            reject(err);
          }
        });
      });

      // 設置 TOTP 為首選 MFA 方式
      await new Promise<void>((resolve, reject) => {
        user.setUserMfaPreference(
          null, // SMS MFA 設置
          { 
            Enabled: true, 
            PreferredMfa: true 
          }, // TOTP MFA 設置
          (err, result) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          }
        );
      });

      showSuccess('TOTP MFA 已成功啟用');
      return { success: true };
    } catch (err) {
      const cognitoError = err as CognitoError;
      let errorMessage = '驗證 TOTP 碼失敗';

      if (cognitoError.name === 'EnableSoftwareTokenMFAException') {
        errorMessage = '驗證碼錯誤，請確保您的驗證器應用是同步的並輸入正確的驗證碼';
      } else if (cognitoError.name === 'NotAuthorizedException') {
        errorMessage = '用戶未授權，請重新登入';
      } else {
        errorMessage = cognitoError.message || '啟用 TOTP MFA 失敗';
      }

      setError(errorMessage);
      showError(errorMessage);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // 設置 SMS MFA
  const setupSmsMfa = useCallback(async (): Promise<{
    success: boolean;
  }> => {
    setLoading(true);
    setError(null);

    try {
      const user = userPool.getCurrentUser();
      if (!user) {
        throw new Error('用戶未登入');
      }

      // 設置 SMS MFA 為首選 MFA 方式
      await new Promise<void>((resolve, reject) => {
        user.setUserMfaPreference(
          { 
            Enabled: true, 
            PreferredMfa: true 
          }, // SMS MFA 設置
          null, // TOTP MFA 設置
          (err, result) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          }
        );
      });

      showSuccess('SMS MFA 已成功啟用');
      return { success: true };
    } catch (err) {
      const cognitoError = err as CognitoError;
      let errorMessage = '設置 SMS MFA 失敗';

      if (cognitoError.name === 'InvalidParameterException') {
        errorMessage = '無法啟用 SMS MFA，請確保您的帳戶有有效的電話號碼';
      } else if (cognitoError.name === 'NotAuthorizedException') {
        errorMessage = '用戶未授權，請重新登入';
      } else {
        errorMessage = cognitoError.message || '啟用 SMS MFA 失敗';
      }

      setError(errorMessage);
      showError(errorMessage);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // 禁用 MFA
  const disableMfa = useCallback(async (): Promise<{
    success: boolean;
  }> => {
    setLoading(true);
    setError(null);

    try {
      const user = userPool.getCurrentUser();
      if (!user) {
        throw new Error('用戶未登入');
      }

      // 設置無 MFA 
      await new Promise<void>((resolve, reject) => {
        user.setUserMfaPreference(
          { 
            Enabled: false, 
            PreferredMfa: false 
          }, // SMS MFA 設置
          { 
            Enabled: false, 
            PreferredMfa: false 
          }, // TOTP MFA 設置
          (err, result) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          }
        );
      });

      showSuccess('MFA 已成功禁用');
      return { success: true };
    } catch (err) {
      const cognitoError = err as CognitoError;
      let errorMessage = '禁用 MFA 失敗';

      if (cognitoError.name === 'NotAuthorizedException') {
        errorMessage = '用戶未授權，請重新登入';
      } else {
        errorMessage = cognitoError.message || '禁用 MFA 失敗';
      }

      setError(errorMessage);
      showError(errorMessage);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // 在組件掛載時檢查用戶的身份驗證狀態
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (typeof window !== 'undefined') {
        // 檢查是否需要新密碼
        if (localStorage.getItem('cognito_new_password_required') === 'true') {
          // 如果有儲存的用戶名，嘗試恢復 CognitoUser 實例
          const username = localStorage.getItem('cognito_username');
          if (username) {
            const cognitoUser = new CognitoUser({
              Username: username,
              Pool: userPool
            });
            
            // 嘗試恢復挑戰會話狀態
            const challengeSessionData = localStorage.getItem('cognito_challenge_session');
            if (challengeSessionData) {
              try {
                const sessionInfo = JSON.parse(challengeSessionData);
                if (sessionInfo.authenticationFlowType) {
                  cognitoUser.setAuthenticationFlowType(sessionInfo.authenticationFlowType);
                }
                // 設置挑戰名稱
                cognitoUser.challengeName = 'NEW_PASSWORD_REQUIRED';
              } catch (e) {
                console.error('解析會話數據失敗:', e);
              }
            }
            
            setCurrentCognitoUser(cognitoUser);
          }
          setNewPasswordRequired(true);
        }
        
        // 檢查是否需要 MFA 驗證
        if (localStorage.getItem('cognito_mfa_required') === 'true') {
          const username = localStorage.getItem('cognito_username');
          const mfaTypeValue = localStorage.getItem('cognito_mfa_type') as MFAType || 'SMS_MFA';
          
          if (username) {
            const cognitoUser = new CognitoUser({
              Username: username,
              Pool: userPool
            });
            
            setCurrentCognitoUser(cognitoUser);
            setMfaRequired(true);
            setMfaType(mfaTypeValue);
          }
        }
      }
    };
    
    checkAuthStatus();
  }, []);

  return {
    signIn,
    signOut,
    signUp,
    forgotPassword,
    confirmNewPassword,
    completeNewPassword,
    getCurrentUser,
    getCurrentSession,
    getJwtToken,
    loading,
    error,
    newPasswordRequired,
    cancelNewPasswordChallenge,
    // MFA 相關函數和狀態
    mfaRequired,
    mfaType,
    verifyMfaCode,
    selectMfaType,
    getUserMfaSettings,
    setupTotpMfa,
    verifyAndEnableTotpMfa,
    setupSmsMfa,
    disableMfa,
    mfaSecret,
    mfaSecretQRCode
  };
}; 