import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/components/auth/AuthContext';
import Head from 'next/head';
import { showError, showInfo, showSuccess } from '@/lib/utils/notification';
import SetupProgressIndicator from '@/components/common/SetupProgressIndicator';

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const { 
    completeNewPassword, 
    isAuthenticated, 
    loading, 
    error, 
    newPasswordRequired, 
    cancelNewPasswordChallenge,
    // 安全設置進度相關
    isFirstLogin,
    currentSetupStep,
    isMfaSetupRequired
  } = useAuth();
  const [loadingState, setLoading] = useState(false);

  // 密碼強度檢查
  const passwordChecks = useMemo(() => {
    const hasMinLength = newPassword.length >= 8;
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
    const passwordsMatch = newPassword === confirmNewPassword && confirmNewPassword.length > 0;

    return {
      hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      passwordsMatch
    };
  }, [newPassword, confirmNewPassword]);

  // 檢查所有密碼條件是否都滿足
  const allConditionsMet = useMemo(() => {
    const { hasMinLength, hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar, passwordsMatch } = passwordChecks;
    return hasMinLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && passwordsMatch;
  }, [passwordChecks]);

  // 計算密碼強度
  const passwordStrength = useMemo(() => {
    const { hasMinLength, hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar } = passwordChecks;
    
    let score = 0;
    if (hasMinLength) score += 1;
    if (hasUpperCase) score += 1;
    if (hasLowerCase) score += 1;
    if (hasNumbers) score += 1;
    if (hasSpecialChar) score += 1;
    
    if (newPassword.length > 12) score += 1;
    
    // 最低分數為0，最高分數為6
    return {
      score,
      percent: (score / 6) * 100,
      text: score === 0 ? '非常弱' : 
            score === 1 ? '弱' : 
            score === 2 ? '弱' : 
            score === 3 ? '中等' : 
            score === 4 ? '強' : 
            score === 5 ? '很強' : '非常強',
      color: score === 0 || score === 1 ? '#ff4d4f' : 
             score === 2 ? '#faad14' : 
             score === 3 ? '#faad14' : 
             score === 4 ? '#52c41a' : 
             score === 5 ? '#52c41a' : '#389e0d'
    };
  }, [passwordChecks, newPassword]);

  useEffect(() => {
    // 檢查是否需要設置新密碼
    const isNewPasswordRequiredFromStorage = localStorage.getItem('cognito_new_password_required') === 'true';
    
    // 如果頁面剛加載，等待 loading 完成
    if (loading) return;
    
    // 如果用戶已經登入且不需要設置新密碼，也沒有儲存需要新密碼的標記，重定向到首頁
    if (isAuthenticated && !newPasswordRequired && !isNewPasswordRequiredFromStorage && !loading) {
      router.push('/');
      return;
    }
    
    // 如果用戶未登入且不需要設置新密碼，也沒有儲存需要新密碼的標記，重定向到登入頁面
    if (!isAuthenticated && !newPasswordRequired && !isNewPasswordRequiredFromStorage && !loading) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, newPasswordRequired, router, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmNewPassword) {
      showError('請檢查新密碼是否符合所有條件');
      return;
    }

    // 檢查密碼是否符合所有要求
    if (!allConditionsMet) {
      showError('請檢查密碼是否符合所有條件');
      return;
    }

    try {
      setLoading(true); // 添加本地加載狀態
      console.log('開始執行設置新密碼...');
      
      const success = await completeNewPassword(newPassword);
      
      if (success) {
        console.log('密碼設置成功，準備重定向...');
        showSuccess('密碼設置成功！');
        
        // 檢查是否是首次登入流程，如果是，且需要設置MFA，則跳轉到MFA設置頁面
        if (isFirstLogin && isMfaSetupRequired) {
          // 延遲一秒後跳轉，確保提示訊息能被看到
          setTimeout(() => {
            router.push('/mfa-setup');
          }, 1000);
        } else {
          // 否則直接跳轉到首頁
          setTimeout(() => {
            router.push('/');
          }, 1000);
        }
      } else {
        console.log('密碼設置返回失敗狀態，但沒有拋出錯誤');
      }
    } catch (err) {
      console.error('設置新密碼時發生未捕獲的錯誤:', err);
      showError('設置新密碼時發生錯誤，請稍後再試');
    } finally {
      setLoading(false); // 確保無論結果如何都會解除加載狀態
    }
  };

  const handleCancel = () => {
    // 使用 cancelNewPasswordChallenge 清除狀態和標記
    cancelNewPasswordChallenge();
    
    // 重定向到登入頁面，不執行任何密碼設置操作
    router.push('/login');
  };

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <>
      <Head>
        <title>設置新密碼</title>
        <meta name="description" content="設置您的新密碼" />
      </Head>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>設置新密碼</h1>
          
          {/* 只有在首次登入時才顯示進度指示器 */}
          {isFirstLogin && (
            <SetupProgressIndicator 
              currentStep="password" 
              isMfaRequired={isMfaSetupRequired} 
            />
          )}
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold' 
              }}>
                新密碼
              </label>
              <div style={{ 
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  id="newPassword"
                  name="newPassword"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    paddingRight: '2.5rem',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                  placeholder="請輸入新密碼"
                  disabled={loadingState}
                />
                <button
                  type="button"
                  onClick={toggleNewPasswordVisibility}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    background: 'none',
                    border: 'none',
                    padding: '0.25rem',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  {showNewPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold' 
              }}>
                確認新密碼
              </label>
              <div style={{ 
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    paddingRight: '2.5rem',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                  placeholder="請再次輸入新密碼"
                  disabled={loadingState}
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    background: 'none',
                    border: 'none',
                    padding: '0.25rem',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            {/* 密碼強度檢查與視覺反饋功能移到確認新密碼欄位下方 */}
            <div style={{ marginBottom: '1.5rem' }}>
              {/* 密碼強度指示器 */}
              {newPassword.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>密碼強度：</span>
                    <span style={{ color: passwordStrength.color, fontWeight: 'bold' }}>{passwordStrength.text}</span>
                  </div>
                  <div style={{ 
                    width: '100%', 
                    height: '6px', 
                    backgroundColor: '#e9e9e9', 
                    borderRadius: '3px', 
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${passwordStrength.percent}%`, 
                      height: '100%', 
                      backgroundColor: passwordStrength.color,
                      transition: 'width 0.3s ease-in-out'
                    }}></div>
                  </div>
                </div>
              )}
              
              {/* 密碼要求檢查列表 */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>密碼必須符合以下條件：</div>
                <ul style={{ 
                  listStyleType: 'none', 
                  padding: '0', 
                  margin: '0', 
                  fontSize: '0.875rem' 
                }}>
                  <li style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '0.25rem',
                    color: passwordChecks.hasMinLength ? '#52c41a' : '#8c8c8c'
                  }}>
                    <span style={{ marginRight: '0.5rem' }}>
                      {passwordChecks.hasMinLength ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                      )}
                    </span>
                    至少 8 個字符
                  </li>
                  <li style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '0.25rem',
                    color: passwordChecks.hasUpperCase ? '#52c41a' : '#8c8c8c'
                  }}>
                    <span style={{ marginRight: '0.5rem' }}>
                      {passwordChecks.hasUpperCase ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                      )}
                    </span>
                    至少一個大寫字母 (A-Z)
                  </li>
                  <li style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '0.25rem',
                    color: passwordChecks.hasLowerCase ? '#52c41a' : '#8c8c8c'
                  }}>
                    <span style={{ marginRight: '0.5rem' }}>
                      {passwordChecks.hasLowerCase ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                      )}
                    </span>
                    至少一個小寫字母 (a-z)
                  </li>
                  <li style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '0.25rem',
                    color: passwordChecks.hasNumbers ? '#52c41a' : '#8c8c8c'
                  }}>
                    <span style={{ marginRight: '0.5rem' }}>
                      {passwordChecks.hasNumbers ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                      )}
                    </span>
                    至少一個數字 (0-9)
                  </li>
                  <li style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    marginBottom: '0.25rem',
                    color: passwordChecks.hasSpecialChar ? '#52c41a' : '#8c8c8c'
                  }}>
                    <span style={{ marginRight: '0.5rem' }}>
                      {passwordChecks.hasSpecialChar ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                      )}
                    </span>
                    至少一個特殊字符 (!@#$%^&*等)
                  </li>
                  {/* 新增密碼一致性檢查 */}
                  <li style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    color: passwordChecks.passwordsMatch ? '#52c41a' : '#8c8c8c'
                  }}>
                    <span style={{ marginRight: '0.5rem' }}>
                      {passwordChecks.passwordsMatch ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                      )}
                    </span>
                    兩次輸入的密碼一致
                  </li>
                </ul>
              </div>
            </div>
            
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: loadingState ? 'not-allowed' : 'pointer',
                  opacity: loadingState ? 0.7 : 1
                }}
                disabled={loadingState}
              >
                {loadingState ? '處理中...' : '設置新密碼'}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: loadingState ? 'not-allowed' : 'pointer',
                  opacity: loadingState ? 0.7 : 1
                }}
                disabled={loadingState}
              >
                返回登入頁面
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
} 