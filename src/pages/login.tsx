import { useState, useEffect } from 'react';
import Head from 'next/head';
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import { cognitoConfig } from '@/lib/config/cognito';
import { showError, showSuccess, mapCognitoErrorToMessage } from '@/utils/notification';
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
        const code = (err && typeof err === 'object' && 'code' in err) ? (err as any).code : '';
        const message = (err && typeof err === 'object' && 'message' in err) ? (err as any).message : '';
        showError(mapCognitoErrorToMessage(code, message) || '登入失敗');
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
        const code = (err && typeof err === 'object' && 'code' in err) ? (err as any).code : '';
        const message = (err && typeof err === 'object' && 'message' in err) ? (err as any).message : '';
        showError(mapCognitoErrorToMessage(code, message) || '設置新密碼失敗');
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
        const code = (err && typeof err === 'object' && 'code' in err) ? (err as any).code : '';
        const message = (err && typeof err === 'object' && 'message' in err) ? (err as any).message : '';
        showError('無法產生 QRCode: ' + (mapCognitoErrorToMessage(code, message) || message || '未知錯誤'));
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
        const code = (err && typeof err === 'object' && 'code' in err) ? (err as any).code : '';
        const message = (err && typeof err === 'object' && 'message' in err) ? (err as any).message : '';
        showError('驗證失敗: ' + (mapCognitoErrorToMessage(code, message) || message || '未知錯誤'));
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
        const code = (err && typeof err === 'object' && 'code' in err) ? (err as any).code : '';
        const message = (err && typeof err === 'object' && 'message' in err) ? (err as any).message : '';
        showError('驗證失敗: ' + (mapCognitoErrorToMessage(code, message) || message || '未知錯誤'));
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8">
              {step === 'login' && (
                <>
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">歡迎回來</h1>
                    <p className="text-gray-600">請登入您的帳號</p>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                        電子郵件
                      </label>
                      <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="請輸入您的電子郵件"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        密碼
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          id="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="請輸入您的密碼"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                              <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? '登入中...' : '登入'}
                    </button>
                  </form>
                </>
              )}

              {step === 'newPassword' && (
                <>
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">設置新密碼</h1>
                    <p className="text-gray-600">請設置一個安全的新密碼</p>
                  </div>
                  <form onSubmit={handleCompleteNewPassword} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        新密碼
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="請輸入新密碼"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {showNewPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                              <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        確認新密碼
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmNewPassword ? "text" : "password"}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="請再次輸入新密碼"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {showConfirmNewPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                              <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {checkPasswordRules(newPassword).map((rule) => (
                        <div key={rule.id} className="flex items-center text-sm">
                          <span className={`mr-2 ${rule.satisfied ? 'text-green-500' : 'text-gray-400'}`}>
                            {rule.satisfied ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                              </svg>
                            )}
                          </span>
                          <span className={rule.satisfied ? 'text-green-600' : 'text-gray-500'}>
                            {rule.label}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !isPasswordValid(newPassword) || newPassword !== confirmNewPassword}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? '處理中...' : '設置新密碼'}
                    </button>
                  </form>
                </>
              )}

              {step === 'mfaSetup' && (
                <>
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">設置驗證器 App</h1>
                    <p className="text-gray-600">請使用驗證器 App 掃描 QR code</p>
                  </div>
                  <div className="space-y-6">
                    <div className="flex justify-center">
                      {!mfaQr ? (
                        <div className="text-gray-500">載入中...</div>
                      ) : (
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <QRCodeSVG value={mfaQr} size={200} level="H" includeMargin={true} />
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        value={totpCode}
                        onChange={e => setTotpCode(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-center text-lg tracking-widest"
                        placeholder="請輸入 6 位數驗證碼"
                        maxLength={6}
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyTotp}
                      disabled={!totpCode || loading}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? '驗證中...' : '啟用 MFA'}
                    </button>
                  </div>
                </>
              )}

              {step === 'mfaVerify' && (
                <>
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">MFA 驗證</h1>
                    <p className="text-gray-600">請輸入驗證器 App 中的驗證碼</p>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <input
                        type="text"
                        value={mfaCode}
                        onChange={e => setMfaCode(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-center text-lg tracking-widest"
                        placeholder="請輸入 6 位數驗證碼"
                        maxLength={6}
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyMfa}
                      disabled={!mfaCode || loading}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? '驗證中...' : '送出驗證碼'}
                    </button>
                  </div>
                </>
              )}

              {step === 'main' && (
                <>
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">登入成功</h1>
                    <p className="text-gray-600">歡迎使用 Hilton AppStream</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    登出
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 