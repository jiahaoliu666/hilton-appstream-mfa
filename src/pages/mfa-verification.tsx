import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/components/auth/AuthContext';
import Head from 'next/head';
import { showError, showSuccess } from '@/lib/utils/notification';
import { MFAType } from '@/lib/hooks/useCognito';

export default function MfaVerification() {
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableMfaTypes, setAvailableMfaTypes] = useState<any[]>([]);
  
  const router = useRouter();
  const { 
    isAuthenticated, 
    loading: authLoading, 
    error, 
    mfaRequired,
    mfaType,
    verifyMfaCode,
    selectMfaType,
    logout
  } = useAuth();

  // 在組件掛載時檢查 MFA 狀態 - 優化邏輯避免無限重定向
  useEffect(() => {
    // 只在非加載狀態時執行檢查，避免過早判斷
    if (authLoading) return;

    // 檢查是否有可用的MFA類型數據
    const mfaOptionsData = typeof window !== 'undefined' ? 
      localStorage.getItem('cognito_mfa_options') : null;
    
    if (mfaOptionsData) {
      try {
        const parsedOptions = JSON.parse(mfaOptionsData);
        if (Array.isArray(parsedOptions) && parsedOptions.length > 0) {
          setAvailableMfaTypes(parsedOptions);
        }
      } catch (err) {
        console.error('解析MFA選項數據時出錯:', err);
      }
    }
    
    // 檢查是否需要 MFA 驗證（從上下文和 localStorage 獲取）
    const isMfaRequiredFromStorage = 
      typeof window !== 'undefined' && localStorage.getItem('cognito_mfa_required') === 'true';
    const needsMfa = mfaRequired || isMfaRequiredFromStorage;
    
    // 只有在明確不需要 MFA 時才重定向
    if (!needsMfa && isAuthenticated) {
      console.log('MFA驗證已完成，重定向到首頁');
      router.push('/');
    }
  }, [isAuthenticated, mfaRequired, router, authLoading]);

  // 驗證MFA碼
  const handleVerifyMfaCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mfaCode) {
      showError('請輸入驗證碼');
      return;
    }

    try {
      setLoading(true);
      const success = await verifyMfaCode(mfaCode);
      
      if (success) {
        showSuccess('驗證成功');
        router.push('/');
      } else {
        showError('驗證失敗，請確保輸入了正確的驗證碼');
      }
    } catch (error) {
      console.error('MFA驗證錯誤:', error);
      showError('驗證過程中發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  // 選擇MFA類型
  const handleSelectMfaType = async (selectedType: MFAType) => {
    try {
      setLoading(true);
      await selectMfaType(selectedType);
    } catch (error) {
      console.error('選擇MFA類型時出錯:', error);
      showError('選擇MFA類型時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  // 返回登入頁面 - 修改為先登出再跳轉
  const handleGoBack = () => {
    // 登出用戶，清除所有身份驗證狀態
    logout();
    
    // 手動清除 MFA 相關的 localStorage 項
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cognito_mfa_required');
      localStorage.removeItem('cognito_mfa_type');
      localStorage.removeItem('cognito_mfa_options');
      localStorage.removeItem('cognito_password');
      
      // 設置一個標記，表明用戶是從 MFA 頁面返回登入頁面的
      sessionStorage.setItem('returningFromMfa', 'true');
    }
    
    // 使用 setTimeout 確保登出操作完成後再跳轉
    setTimeout(() => {
      router.push('/login');
    }, 100);
  };

  // 渲染MFA選項選擇器
  const renderMfaTypeSelector = () => (
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
  );

  // 渲染MFA驗證碼輸入表單
  const renderMfaCodeInput = () => (
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
  );

  return (
    <>
      <Head>
        <title>雙重驗證 | Hilton AppStream</title>
        <meta name="description" content="進行雙重驗證以登入系統" />
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
          <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>雙重驗證</h1>
          
          <form onSubmit={handleVerifyMfaCode}>
            {/* 選擇MFA類型 */}
            {mfaType === 'SELECT_MFA_TYPE' && availableMfaTypes.length > 0 && renderMfaTypeSelector()}
            
            {/* MFA驗證碼輸入 */}
            {(mfaType === 'SMS_MFA' || mfaType === 'SOFTWARE_TOKEN_MFA') && renderMfaCodeInput()}

            {/* 按鈕區域 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                disabled={!mfaCode || loading || mfaType === 'SELECT_MFA_TYPE'}
              >
                {loading ? '驗證中...' : '驗證'}
              </button>

              <button
                type="button"
                onClick={handleGoBack}
                style={{
                  width: '100%',
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
                返回登入頁面
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
} 