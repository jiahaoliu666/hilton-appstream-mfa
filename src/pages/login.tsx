import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/components/auth/AuthContext';
import Head from 'next/head';
import { showError, showInfo } from '@/lib/utils/notification';
import { MFAType } from '@/lib/hooks/useCognito';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [formStep, setFormStep] = useState<'login' | 'mfa'>('login');
  const [availableMfaTypes, setAvailableMfaTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { 
    login, 
    isAuthenticated, 
    loading: authLoading, 
    error: authError, 
    newPasswordRequired,
    // MFA 相關
    mfaRequired,
    mfaType,
    verifyMfaCode,
    selectMfaType,
    getUserMfaSettings
  } = useAuth();

  // 簡化檢查邏輯，避免與 ProtectedRoute 衝突
  useEffect(() => {
    // 如果正在加載，不執行任何檢查
    if (authLoading) return;
    
    // 其他的路由保護邏輯將由 ProtectedRoute 組件處理
    // 這裡只保留必要的檢查，避免重複邏輯
  }, [authLoading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!username || !password) {
      showError('請輸入電子郵件和密碼');
      return;
    }

    try {
      const result = await login(username, password);
      
      if (result.mfaRequired) {
        // 如果是 Cognito 的 MFA_SETUP 挑戰，直接導向 MFA 設置頁面
        if (result.mfaType === 'SOFTWARE_TOKEN_MFA') {
          // 只導向，不 showInfo，避免重複提示
          router.push('/mfa-setup');
          return;
        }
        // 其他情況才顯示錯誤
        showError('此帳號已啟用 MFA，請聯繫管理員或重設帳號。');
        return;
      }
      
      if (result.newPasswordRequired) {
        router.push('/change-password');
        return;
      }
      
      if (result.success) {
        // 強制檢查 MFA 狀態
        if (typeof window !== 'undefined') {
          getUserMfaSettings().then((mfaSettings: any) => {
            if (!mfaSettings.enabled) {
              // 只導向，不 showInfo，避免重複提示
              router.push('/mfa-setup');
            } else {
              router.push('/');
            }
          });
        }
        return;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('登入失敗，請檢查您的用戶名和密碼');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <Head>
        <title>Hilton AppStream 登入系統</title>
        <meta name="description" content="AppStream 登入系統<" />
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
          <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>
            登入
          </h1>
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label 
                htmlFor="username"
                style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold' 
                }}
              >
                電子郵件
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
                placeholder="請輸入您的電子郵件"
                disabled={loading}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label 
                htmlFor="password"
                style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold' 
                }}
              >
                密碼
              </label>
              <div style={{ 
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    paddingRight: '2.5rem', // 為圖標留出空間
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                  placeholder="請輸入您的密碼"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
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
                  {showPassword ? (
                    // 隱藏密碼圖標
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    // 顯示密碼圖標
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
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
              {loading ? '登入中...' : '登入'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
} 