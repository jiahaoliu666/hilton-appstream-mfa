import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/components/auth/AuthContext';
import Head from 'next/head';
import { showError } from '@/lib/utils/notification';
import { MFAType } from '@/lib/hooks/useCognito';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [formStep, setFormStep] = useState<'login' | 'mfa'>('login');
  const [availableMfaTypes, setAvailableMfaTypes] = useState<any[]>([]);
  
  const router = useRouter();
  const { 
    login, 
    isAuthenticated, 
    loading, 
    error, 
    newPasswordRequired,
    // MFA 相關
    mfaRequired,
    mfaType,
    verifyMfaCode,
    selectMfaType
  } = useAuth();

  // 檢查是否有需要設置新密碼的標記
  useEffect(() => {
    // 檢查 localStorage 中是否有設置新密碼的標記
    const isNewPasswordRequiredFromStorage = 
      typeof window !== 'undefined' && localStorage.getItem('cognito_new_password_required') === 'true';
    
    // 如果正在加載，不執行任何重定向
    if (loading) return;
    
    // 如果用戶已經登入，重定向到首頁
    if (isAuthenticated && !loading) {
      router.push('/');
      return;
    }
    
    // 如果需要設置新密碼，重定向到設置密碼頁面
    if ((newPasswordRequired || isNewPasswordRequiredFromStorage) && !loading) {
      router.push('/change-password');
      return;
    }
    
    // 檢查是否需要 MFA 驗證
    const isMfaRequiredFromStorage = 
      typeof window !== 'undefined' && localStorage.getItem('cognito_mfa_required') === 'true';
    
    if ((mfaRequired || isMfaRequiredFromStorage) && !loading) {
      setFormStep('mfa');
      return;
    }
  }, [isAuthenticated, newPasswordRequired, mfaRequired, router, loading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      showError('請輸入電子郵件和密碼');
      return;
    }

    try {
      const result = await login(username, password);
      
      if (result.success) {
        router.push('/');
      } else if (result.newPasswordRequired) {
        router.push('/change-password');
      } else if (result.mfaRequired) {
        setFormStep('mfa');
        if (result.availableMfaTypes) {
          setAvailableMfaTypes(result.availableMfaTypes);
        }
      }
    } catch (err) {
      // 移除重複的錯誤顯示
    }
  };

  const handleVerifyMfaCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mfaCode) {
      showError('請輸入驗證碼');
      return;
    }

    try {
      const success = await verifyMfaCode(mfaCode);
      
      if (success) {
        router.push('/');
      }
    } catch (err) {
      // 移除重複的錯誤顯示
    }
  };

  const handleSelectMfaType = async (selectedType: MFAType) => {
    try {
      await selectMfaType(selectedType);
    } catch (err) {
      // 移除重複的錯誤顯示
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const renderLoginForm = () => (
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
  );

  const renderMfaForm = () => (
    <form onSubmit={handleVerifyMfaCode}>
      {/* 顯示多 MFA 選項時的選擇器 */}
      {mfaType === 'SELECT_MFA_TYPE' && availableMfaTypes.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: 'bold' 
          }}>
            選擇驗證方式
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {availableMfaTypes.map((option, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectMfaType(option.DeliveryMedium === 'SMS' ? 'SMS_MFA' : 'SOFTWARE_TOKEN_MFA')}
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {option.DeliveryMedium === 'SMS' ? '簡訊驗證碼' : '驗證器應用程式'}
                {option.AttributeName && ` (${option.AttributeName})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SMS MFA 或 TOTP MFA 的輸入框 */}
      {(mfaType === 'SMS_MFA' || mfaType === 'SOFTWARE_TOKEN_MFA') && (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <label 
              htmlFor="mfaCode"
              style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold' 
              }}
            >
              {mfaType === 'SMS_MFA' ? '簡訊驗證碼' : '驗證器驗證碼'}
            </label>
            <input
              type="text"
              id="mfaCode"
              name="mfaCode"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
              placeholder={mfaType === 'SMS_MFA' ? '請輸入簡訊驗證碼' : '請輸入驗證器應用的驗證碼'}
              disabled={loading}
            />
            {mfaType === 'SMS_MFA' && (
              <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                驗證碼已發送到您的手機，請查看簡訊並輸入收到的驗證碼。
              </p>
            )}
            {mfaType === 'SOFTWARE_TOKEN_MFA' && (
              <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                請打開您的驗證器應用 (如 Google Authenticator)，輸入顯示的 6 位數驗證碼。
              </p>
            )}
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
            {loading ? '驗證中...' : '驗證'}
          </button>

          <button
            type="button"
            onClick={() => setFormStep('login')}
            style={{
              width: '100%',
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            disabled={loading}
          >
            返回
          </button>
        </>
      )}
    </form>
  );

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
            {formStep === 'login' ? '登入' : '雙重驗證'}
          </h1>
          
          {formStep === 'login' ? renderLoginForm() : renderMfaForm()}
        </div>
      </div>
    </>
  );
} 