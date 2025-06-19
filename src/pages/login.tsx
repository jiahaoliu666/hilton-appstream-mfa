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
        if (user) {
          user.getSession((err: Error | null, session: any) => {
            if (!err && session && session.isValid()) {
              user.getUserAttributes((err2, attributes) => {
                if (!err2 && attributes) {
                  const emailAttr = attributes.find(attr => attr.getName() === 'email');
                  if (emailAttr) {
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('cognito_email', emailAttr.getValue());
                    }
                  }
                }
              });
            }
          });
        }
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
        showError('驗證失敗：' + (mapCognitoErrorToMessage(code, message) || message || '未知錯誤'));
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
        showError('驗證失敗：' + (mapCognitoErrorToMessage(code, message) || message || '未知錯誤'));
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden backdrop-blur-sm bg-opacity-90">
            <div className="p-8">
              {step === 'login' && (
                <>
                  <div className="text-center mb-8">
                    <div className="mb-1">
                      <img src="/logo.png" alt="Hilton Logo" className="w-32 h-20 object-contain mx-auto" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">歡迎回來</h1>
                    <p className="text-gray-600">請登入您的帳號</p>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                        電子郵件
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          placeholder="請輸入您的電子郵件"
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        密碼
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          id="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`w-full pl-10 pr-12 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-left font-mono ${showPassword ? '' : 'tracking-password'}`}
                          placeholder="請輸入您的密碼"
                          disabled={loading}
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
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
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          登入中...
                        </div>
                      ) : '登入'}
                    </button>
                  </form>
                </>
              )}

              {step === 'newPassword' && (
                <>
                  <div className="text-center mb-8">
                    <div className="mb-4">
                      <svg className="w-16 h-16 mx-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">設置新密碼</h1>
                    <p className="text-gray-600">請設置一個安全的新密碼</p>
                  </div>
                  <form onSubmit={handleCompleteNewPassword} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        新密碼
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          placeholder="請輸入新密碼"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
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
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        確認新密碼
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input
                          type={showConfirmNewPassword ? "text" : "password"}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          placeholder="請再次輸入新密碼"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
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
                    <div className="space-y-2 bg-gray-50 p-4 rounded-xl">
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
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          處理中...
                        </div>
                      ) : '設置新密碼'}
                    </button>
                  </form>
                </>
              )}

              {step === 'mfaSetup' && (
                <>
                  <div className="text-center mb-8">
                    <div className="mb-4">
                      <svg className="w-16 h-16 mx-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">設置驗證器 App</h1>
                    <p className="text-gray-600">請使用驗證器 App 掃描 QR code</p>
                  </div>
                  <div className="space-y-6">
                    <div className="flex justify-center">
                      {!mfaQr ? (
                        <div className="text-gray-500">載入中...</div>
                      ) : (
                        <div className="bg-white p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105">
                          <QRCodeSVG value={mfaQr} size={200} level="H" includeMargin={true} />
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        value={totpCode}
                        onChange={e => setTotpCode(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-center text-lg tracking-widest"
                        placeholder="請輸入 6 位數驗證碼"
                        maxLength={6}
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyTotp}
                      disabled={!totpCode || loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          驗證中...
                        </div>
                      ) : '啟用 MFA'}
                    </button>
                  </div>
                </>
              )}

              {step === 'mfaVerify' && (
                <>
                  <div className="text-center mb-8">
                    <div className="mb-4">
                      <svg className="w-16 h-16 mx-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">MFA 驗證</h1>
                    <p className="text-gray-600">請輸入驗證器 App 中的驗證碼</p>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <input
                        type="text"
                        value={mfaCode}
                        onChange={e => setMfaCode(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-center text-lg tracking-widest"
                        placeholder="請輸入 6 位數驗證碼"
                        maxLength={6}
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyMfa}
                      disabled={!mfaCode || loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          驗證中...
                        </div>
                      ) : '送出驗證碼'}
                    </button>
                  </div>
                </>
              )}

              {step === 'main' && (
                <>
                  <div className="text-center mb-8">
                    <div className="mb-4">
                      <svg className="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">登入成功</h1>
                    <p className="text-gray-600">歡迎使用 Hilton AppStream</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-4 rounded-xl font-medium hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200"
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