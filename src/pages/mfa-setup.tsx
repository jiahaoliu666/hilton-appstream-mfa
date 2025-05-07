import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/components/auth/AuthContext';
import Head from 'next/head';
import { showError, showSuccess } from '@/lib/utils/notification';
import { QRCodeSVG } from 'qrcode.react';

export default function MfaSetup() {
  const [step, setStep] = useState<'options' | 'setup-totp' | 'verify-totp'>('options');
  const [mfaSettings, setMfaSettings] = useState<{
    enabled: boolean;
    preferredMfa?: string;
    mfaOptions?: any[];
  }>({ enabled: false });
  const [totpCode, setTotpCode] = useState('');
  const [deviceName, setDeviceName] = useState('我的驗證器');
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<{
    secretCode?: string;
    qrCodeUrl?: string;
  }>({});

  const router = useRouter();
  const { 
    isAuthenticated, 
    getUserMfaSettings, 
    setupTotpMfa, 
    verifyAndEnableTotpMfa,
    setupSmsMfa,
    disableMfa,
    mfaSecret,
    mfaSecretQRCode
  } = useAuth();

  // 在組件掛載時檢查 MFA 設置
  useEffect(() => {
    const checkMfaSettings = async () => {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      try {
        setLoading(true);
        const result = await getUserMfaSettings();
        
        if (result.success) {
          setMfaSettings({
            enabled: result.enabled || false,
            preferredMfa: result.preferredMfa,
            mfaOptions: result.mfaOptions || []
          });
        }
      } catch (error) {
        console.error('Failed to get MFA settings:', error);
        showError('獲取 MFA 設置失敗');
      } finally {
        setLoading(false);
      }
    };

    checkMfaSettings();
  }, [isAuthenticated, getUserMfaSettings, router]);

  // 開始設置 TOTP
  const handleSetupTotpMfa = async () => {
    try {
      setLoading(true);
      const result = await setupTotpMfa();
      
      if (result.success && result.secretCode && result.qrCodeUrl) {
        setSetupData({
          secretCode: result.secretCode,
          qrCodeUrl: result.qrCodeUrl
        });
        setStep('setup-totp');
      } else {
        showError('設置 TOTP MFA 失敗');
      }
    } catch (error) {
      console.error('Setup TOTP error:', error);
      showError('設置 TOTP MFA 失敗');
    } finally {
      setLoading(false);
    }
  };

  // 驗證 TOTP 碼並啟用 MFA
  const handleVerifyTotpMfa = async () => {
    if (!totpCode) {
      showError('請輸入驗證碼');
      return;
    }

    try {
      setLoading(true);
      const success = await verifyAndEnableTotpMfa(totpCode, deviceName);
      
      if (success) {
        showSuccess('TOTP MFA 已成功啟用');
        
        // 刷新 MFA 設置
        const result = await getUserMfaSettings();
        if (result.success) {
          setMfaSettings({
            enabled: result.enabled || false,
            preferredMfa: result.preferredMfa,
            mfaOptions: result.mfaOptions || []
          });
        }
        
        setStep('options');
      } else {
        showError('驗證失敗，請確保輸入了正確的驗證碼');
      }
    } catch (error) {
      console.error('Verify TOTP error:', error);
      showError('驗證 TOTP 碼失敗');
    } finally {
      setLoading(false);
    }
  };

  // 設置 SMS MFA
  const handleSetupSmsMfa = async () => {
    try {
      setLoading(true);
      const success = await setupSmsMfa();
      
      if (success) {
        showSuccess('SMS MFA 已成功啟用');
        
        // 刷新 MFA 設置
        const result = await getUserMfaSettings();
        if (result.success) {
          setMfaSettings({
            enabled: result.enabled || false,
            preferredMfa: result.preferredMfa,
            mfaOptions: result.mfaOptions || []
          });
        }
      } else {
        showError('設置 SMS MFA 失敗，請確保您的帳戶已關聯手機號碼');
      }
    } catch (error) {
      console.error('Setup SMS MFA error:', error);
      showError('設置 SMS MFA 失敗');
    } finally {
      setLoading(false);
    }
  };

  // 禁用 MFA
  const handleDisableMfa = async () => {
    if (!window.confirm('確定要禁用多因素認證嗎？這將降低您帳戶的安全性。')) {
      return;
    }

    try {
      setLoading(true);
      const success = await disableMfa();
      
      if (success) {
        showSuccess('MFA 已成功禁用');
        
        // 刷新 MFA 設置
        const result = await getUserMfaSettings();
        if (result.success) {
          setMfaSettings({
            enabled: result.enabled || false,
            preferredMfa: result.preferredMfa,
            mfaOptions: result.mfaOptions || []
          });
        }
      } else {
        showError('禁用 MFA 失敗');
      }
    } catch (error) {
      console.error('Disable MFA error:', error);
      showError('禁用 MFA 失敗');
    } finally {
      setLoading(false);
    }
  };

  // 返回到首頁
  const handleGoBack = () => {
    router.push('/');
  };

  // 渲染 MFA 選項頁面
  const renderOptionsPage = () => (
    <div>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>多因素認證 (MFA) 設置</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ marginBottom: '1rem' }}>
          多因素認證可以增強您的帳戶安全性。啟用後，除了密碼外，您還需要提供額外的驗證碼才能登入系統。
        </p>
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ marginBottom: '0.5rem' }}>當前狀態</h3>
          <p><strong>MFA 已{mfaSettings.enabled ? '啟用' : '禁用'}</strong></p>
          {mfaSettings.enabled && mfaSettings.preferredMfa && (
            <p>
              <strong>首選方式: </strong>
              {mfaSettings.preferredMfa === 'SOFTWARE_TOKEN_MFA' 
                ? '驗證器應用 (TOTP)' 
                : mfaSettings.preferredMfa === 'SMS_MFA' 
                  ? '簡訊驗證碼 (SMS)' 
                  : mfaSettings.preferredMfa}
            </p>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>選擇 MFA 方式</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            type="button"
            onClick={handleSetupTotpMfa}
            disabled={loading}
            style={{
              padding: '1rem',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontSize: '1rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {/* 驗證器應用圖標 */}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M7 12h10" />
              <path d="M12 7v10" />
            </svg>
            設置驗證器應用 (TOTP)
          </button>
          
          <button
            type="button"
            onClick={handleSetupSmsMfa}
            disabled={loading}
            style={{
              padding: '1rem',
              backgroundColor: '#2e7d32',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontSize: '1rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {/* 簡訊圖標 */}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            設置簡訊驗證 (SMS)
          </button>
          
          {mfaSettings.enabled && (
            <button
              type="button"
              onClick={handleDisableMfa}
              disabled={loading}
              style={{
                padding: '1rem',
                backgroundColor: '#d32f2f',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontSize: '1rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {/* 禁用圖標 */}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              禁用多因素認證
            </button>
          )}
        </div>
      </div>
      
      <button
        type="button"
        onClick={handleGoBack}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: '#f5f5f5',
          color: '#666',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
          fontWeight: 'bold'
        }}
        disabled={loading}
      >
        返回
      </button>
    </div>
  );

  // 渲染 TOTP 設置頁面
  const renderTotpSetupPage = () => (
    <div>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>設置驗證器應用</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ marginBottom: '1rem' }}>
          請按照以下步驟設置您的驗證器應用:
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>
            在您的手機上安裝支持 TOTP 的驗證器應用，如 Google Authenticator、Microsoft Authenticator 或 Authy。
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            打開應用並掃描下方的 QR 碼，或手動輸入密鑰。
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            輸入應用中生成的 6 位驗證碼以完成設置。
          </li>
        </ol>
      </div>

      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '2rem',
        backgroundColor: '#f5f5f5',
        padding: '1.5rem',
        borderRadius: '8px'
      }}>
        {/* QR 碼 */}
        <div style={{ marginBottom: '1.5rem' }}>
          {setupData.qrCodeUrl ? (
            <QRCodeSVG 
              value={setupData.qrCodeUrl} 
              size={200}
              level="H"
              includeMargin={true}
            />
          ) : (
            <div style={{ 
              width: '200px', 
              height: '200px', 
              backgroundColor: '#ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center' 
            }}>
              加載 QR 碼中...
            </div>
          )}
        </div>
        
        {/* 手動輸入的密鑰 */}
        <div style={{ marginBottom: '1rem', width: '100%' }}>
          <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>密鑰 (如果無法掃描 QR 碼):</p>
          <div style={{ 
            backgroundColor: 'white',
            padding: '0.75rem',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '1.1rem',
            textAlign: 'center',
            wordBreak: 'break-all',
            border: '1px dashed #ccc'
          }}>
            {setupData.secretCode || '...'}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          設備名稱 (可選)
        </label>
        <input
          type="text"
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            marginBottom: '1rem'
          }}
          placeholder="例如: 我的 iPhone"
          disabled={loading}
        />
        
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          驗證碼
        </label>
        <input
          type="text"
          value={totpCode}
          onChange={(e) => setTotpCode(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
          placeholder="輸入驗證器應用顯示的 6 位數驗證碼"
          maxLength={6}
          disabled={loading}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          type="button"
          onClick={() => setStep('options')}
          style={{
            flex: '1',
            padding: '0.75rem',
            backgroundColor: '#f5f5f5',
            color: '#666',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem'
          }}
          disabled={loading}
        >
          返回
        </button>
        
        <button
          type="button"
          onClick={handleVerifyTotpMfa}
          style={{
            flex: '2',
            padding: '0.75rem',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
          disabled={!totpCode || loading}
        >
          {loading ? '驗證中...' : '驗證並啟用'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>多因素認證設置 | Hilton AppStream</title>
        <meta name="description" content="設置多因素認證以增強帳戶安全性" />
      </Head>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '2rem 1rem',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '600px',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          {step === 'options' && renderOptionsPage()}
          {step === 'setup-totp' && renderTotpSetupPage()}
        </div>
      </div>
    </>
  );
} 