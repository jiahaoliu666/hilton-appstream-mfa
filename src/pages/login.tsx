import { useState, useEffect } from 'react';
import Head from 'next/head';
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import { cognitoConfig } from '@/lib/config/cognito';
import { showError, showSuccess } from '@/utils/notification';
import { QRCodeSVG } from 'qrcode.react';
import { useRouter } from 'next/router';

const userPool = new CognitoUserPool({
  UserPoolId: cognitoConfig.userPoolId,
  ClientId: cognitoConfig.clientId
});

export default function Login() {
  const router = useRouter();
  const [step, setStep] = useState<'login' | 'newPassword' | 'mfaSetup' | 'mfaVerify' | 'main'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [cognitoUser, setCognitoUser] = useState<CognitoUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaQr, setMfaQr] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);

  // 密碼強度驗證規則
  const passwordRules = [
    { id: 'length', label: '至少 8 個字元', regex: /.{8,}/ },
    { id: 'uppercase', label: '至少 1 個大寫字母', regex: /[A-Z]/ },
    { id: 'lowercase', label: '至少 1 個小寫字母', regex: /[a-z]/ },
    { id: 'number', label: '至少 1 個數字', regex: /[0-9]/ },
    { id: 'special', label: '至少 1 個特殊符號', regex: /[!@#$%^&*(),.?":{}|<>]/ }
  ];

  // 檢查密碼是否符合規則
  const checkPasswordRules = (password: string) => {
    return passwordRules.map(rule => ({
      ...rule,
      satisfied: rule.regex.test(password)
    }));
  };

  // 檢查密碼是否完全符合所有規則
  const isPasswordValid = (password: string) => {
    return passwordRules.every(rule => rule.regex.test(password));
  };

  useEffect(() => {
    const user = userPool.getCurrentUser();
    if (user) {
      user.getSession((err: any, session: any) => {
        if (!err && session && session.isValid()) {
          setCognitoUser(user);
          setStep('main');
        } else {
          setStep('login');
        }
      });
    } else {
      setStep('login');
    }
  }, []);

  useEffect(() => {
    if (step === 'main') {
      router.replace('/');
    }
  }, [step, router]);

  // 登入流程
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const authDetails = new AuthenticationDetails({
      Username: username,
      Password: password
    });
    const user = new CognitoUser({
      Username: username,
      Pool: userPool
    });
    setCognitoUser(user);
    user.authenticateUser(authDetails, {
      onSuccess: () => {
        showSuccess('登入成功');
        setStep('main');
      },
      onFailure: (err) => {
        showError(err.message || '登入失敗');
        setLoading(false);
      },
      newPasswordRequired: () => {
        setStep('newPassword');
        setLoading(false);
      },
      mfaSetup: () => {
        setStep('mfaSetup');
        setLoading(false);
      },
      mfaRequired: () => {
        setStep('mfaVerify');
        setLoading(false);
      },
      totpRequired: () => {
        setStep('mfaVerify');
        setLoading(false);
      }
    });
  };

  // 設置新密碼流程
  const handleCompleteNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cognitoUser) return;
    if (!isPasswordValid(newPassword) || newPassword !== confirmNewPassword) {
      showError('密碼不符合安全要求，請檢查是否滿足所有條件');
      return;
    }
    setLoading(true);
    cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess: () => {
        showSuccess('密碼設置成功');
        setStep('main');
        setLoading(false);
      },
      onFailure: (err) => {
        showError(err.message || '設置新密碼失敗');
        setLoading(false);
      },
      mfaSetup: () => {
        setStep('mfaSetup');
        setLoading(false);
      }
    });
  };

  // MFA 設定流程
  const handleSetupTotp = () => {
    if (!cognitoUser) return;
    setLoading(true);
    cognitoUser.associateSoftwareToken({
      associateSecretCode: (secret) => {
        setMfaSecret(secret);
        const qr = `otpauth://totp/${encodeURIComponent(cognitoConfig.appName)}:${encodeURIComponent(username)}?secret=${secret}&issuer=${encodeURIComponent(cognitoConfig.appName)}`;
        setMfaQr(qr);
        setLoading(false);
      },
      onFailure: (err) => {
        showError('無法產生 QRCode: ' + (err.message || '未知錯誤'));
        setLoading(false);
      }
    });
  };

  const handleVerifyTotp = () => {
    if (!cognitoUser) return;
    setLoading(true);
    cognitoUser.verifySoftwareToken(totpCode, '我的驗證器', {
      onSuccess: () => {
        // 設定 TOTP 為首選 MFA
        cognitoUser.setUserMfaPreference(null, { Enabled: true, PreferredMfa: true }, (err) => {
          if (err) {
            showError('啟用 TOTP MFA 失敗: ' + err.message);
            setLoading(false);
            return;
          }
          showSuccess('TOTP MFA 已成功啟用');
          setStep('main');
          setLoading(false);
        });
      },
      onFailure: (err) => {
        showError('驗證失敗: ' + (err.message || '未知錯誤'));
        setLoading(false);
      }
    });
  };

  const handleVerifyMfa = () => {
    if (!cognitoUser) return;
    setLoading(true);
    cognitoUser.sendMFACode(mfaCode, {
      onSuccess: () => {
        showSuccess('MFA 驗證成功');
        setStep('main');
        setLoading(false);
      },
      onFailure: (err) => {
        showError('驗證失敗: ' + (err.message || '未知錯誤'));
        setLoading(false);
      }
    }, 'SOFTWARE_TOKEN_MFA');
  };

  const handleLogout = () => {
    const user = userPool.getCurrentUser();
    if (user) user.signOut();
    setStep('login');
    setUsername('');
    setPassword('');
    setCognitoUser(null);
  };

  // 自動產生 QRCode 的副作用
  useEffect(() => {
    if (step === 'mfaSetup' && !mfaQr && cognitoUser) {
      handleSetupTotp();
    }
  }, [step, mfaQr, cognitoUser]);

  // step-based UI
  return (
    <>
      <Head>
        <title>Hilton AppStream 登入系統</title>
        <meta name="description" content="AppStream 登入系統" />
      </Head>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f5f5f5', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '2rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          {step === 'login' && (
            <>
              <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>登入</h1>
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="username" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>電子郵件</label>
                  <input type="text" id="username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="請輸入您的電子郵件" disabled={loading} />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>密碼</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input type={showPassword ? "text" : "password"} id="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="請輸入您的密碼" disabled={loading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: '#666' }}>
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      )}
                    </button>
                  </div>
                </div>
                <button type="submit" style={{ width: '100%', padding: '0.75rem', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }} disabled={loading}>{loading ? '登入中...' : '登入'}</button>
              </form>
            </>
          )}
          {step === 'newPassword' && (
            <>
              <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>設置新密碼</h1>
              <form onSubmit={handleCompleteNewPassword}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>新密碼</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type={showNewPassword ? "text" : "password"} 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem', borderRadius: '4px', border: '1px solid #ccc' }} 
                      placeholder="請輸入新密碼" 
                      disabled={loading} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowNewPassword(!showNewPassword)} 
                      style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: '#666' }}
                    >
                      {showNewPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>確認新密碼</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type={showConfirmNewPassword ? "text" : "password"} 
                      value={confirmNewPassword} 
                      onChange={(e) => setConfirmNewPassword(e.target.value)} 
                      style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem', borderRadius: '4px', border: '1px solid #ccc' }} 
                      placeholder="請再次輸入新密碼" 
                      disabled={loading} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} 
                      style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: '#666' }}
                    >
                      {showConfirmNewPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      )}
                    </button>
                  </div>
                  {/* 密碼規則提示與匹配提示統一放在這裡 */}
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    {checkPasswordRules(newPassword).map((rule) => (
                      <div key={rule.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem', color: rule.satisfied ? '#4caf50' : '#666' }}>
                        <span style={{ marginRight: '0.5rem' }}>
                          {rule.satisfied ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
                          )}
                        </span>
                        {rule.label}
                      </div>
                    ))}
                    {/* 密碼不匹配提示預設顯示，根據狀態切換顏色與圖示 */}
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', color:
                      confirmNewPassword.length === 0 ? '#666' :
                      (newPassword === confirmNewPassword && confirmNewPassword.length > 0 ? '#4caf50' : '#f44336')
                    }}>
                      {newPassword === confirmNewPassword && confirmNewPassword.length > 0 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}><circle cx="12" cy="12" r="10"></circle></svg>
                      )}
                      密碼不匹配
                    </div>
                  </div>
                </div>
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
                    cursor: loading ? 'not-allowed' : 'pointer', 
                    opacity: loading ? 0.7 : 1 
                  }} 
                  disabled={loading}
                >
                  {loading ? '處理中...' : '設置新密碼'}
                </button>
              </form>
            </>
          )}
          {step === 'mfaSetup' && (
            <>
              <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>設置驗證器 App MFA</h1>
              {/* 自動產生 QRCode */}
              <div style={{ marginBottom: '1.5rem' }}>
                {!mfaQr && (
                  <div style={{ color: '#888', textAlign: 'center', marginBottom: '1rem' }}>載入中...</div>
                )}
              </div>
              {mfaQr && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <QRCodeSVG value={mfaQr} size={120} level="H" includeMargin={true} />
                  <div style={{ marginTop: '1rem', fontSize: '0.95rem', color: '#333' }}>請用驗證器 App 掃描 QR code</div>
                </div>
              )}
              <div style={{ marginBottom: '1.5rem' }}>
                <input type="text" value={totpCode} onChange={e => setTotpCode(e.target.value)} style={{ width: '100%', padding: '0.85rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1.1rem', marginTop: '0.5rem', letterSpacing: '0.2em', textAlign: 'center' }} placeholder="請輸入 6 位數驗證碼" maxLength={6} disabled={loading} />
              </div>
              <button type="button" onClick={handleVerifyTotp} style={{ width: '100%', padding: '0.95rem', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.5rem', marginBottom: '0.5rem', letterSpacing: '0.05em' }} disabled={!totpCode || loading}>{loading ? '驗證中...' : '啟用 MFA'}</button>
            </>
          )}
          {step === 'mfaVerify' && (
            <>
              <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>MFA 驗證</h1>
              <div style={{ marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value)}
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1.1rem', marginTop: '0.5rem', letterSpacing: '0.2em', textAlign: 'center' }}
                  placeholder="請輸入 6 位數驗證碼"
                  maxLength={6}
                  disabled={loading}
                />
              </div>
              <button
                type="button"
                onClick={handleVerifyMfa}
                style={{ width: '100%', padding: '0.95rem', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.5rem', marginBottom: '0.5rem', letterSpacing: '0.05em' }}
                disabled={!mfaCode || loading}
              >
                {loading ? '驗證中...' : '送出驗證碼'}
              </button>
            </>
          )}
          {step === 'main' && (
            <>
              <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Hello World!</h1>
              <p style={{ marginBottom: '2rem' }}>您已成功登入</p>
              <button onClick={handleLogout} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>登出</button>
            </>
          )}
        </div>
      </div>
    </>
  );
} 