import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/components/auth/AuthContext';
import Head from 'next/head';
import { showError, showSuccess } from '@/lib/utils/notification';
import { QRCodeSVG } from 'qrcode.react';

export default function MfaSetup() {
  const [setupData, setSetupData] = useState<{ secretCode?: string; qrCodeUrl?: string }>({});
  const [totpCode, setTotpCode] = useState('');
  const [deviceName, setDeviceName] = useState('我的驗證器');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setupTotpMfa, verifyAndEnableTotpMfa } = useAuth();

  useEffect(() => {
    const doSetup = async () => {
      setLoading(true);
      const result = await setupTotpMfa();
      if (result.success && result.secretCode && result.qrCodeUrl) {
        setSetupData({ secretCode: result.secretCode, qrCodeUrl: result.qrCodeUrl });
      } else {
        showError('無法產生 QRCode，請稍後再試');
      }
      setLoading(false);
    };
    doSetup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async () => {
    if (!totpCode) {
      showError('請輸入驗證碼');
      return;
    }
    setLoading(true);
    const success = await verifyAndEnableTotpMfa(totpCode, deviceName);
    setLoading(false);
    if (success) {
      showSuccess('TOTP MFA 已成功啟用，將自動跳轉首頁');
      setTimeout(() => {
        router.push('/');
      }, 1200);
    } else {
      showError('驗證失敗，請確認驗證碼正確且未過期');
    }
  };

  return (
    <>
      <Head>
        <title>設置驗證器應用 (TOTP) | Hilton AppStream</title>
        <meta name="description" content="設置多因素認證以增強帳戶安全性" />
      </Head>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '2rem 1rem', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '2rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>設置驗證器應用 (TOTP)</h1>
          <ol style={{ marginBottom: '2rem', paddingLeft: '1.2rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>用手機安裝 Google Authenticator、Microsoft Authenticator 或 Authy。</li>
            <li style={{ marginBottom: '0.5rem' }}>掃描下方 QRCode 或手動輸入密鑰。</li>
            <li style={{ marginBottom: '0.5rem' }}>輸入 App 產生的 6 位驗證碼。</li>
          </ol>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', backgroundColor: '#f5f5f5', padding: '1.5rem', borderRadius: '8px' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              {setupData.qrCodeUrl ? (
                <QRCodeSVG value={setupData.qrCodeUrl} size={200} level="H" includeMargin={true} />
              ) : (
                <div style={{ width: '200px', height: '200px', backgroundColor: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>加載 QR 碼中...</div>
              )}
            </div>
            <div style={{ marginBottom: '1rem', width: '100%' }}>
              <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>密鑰（手動輸入用）:</p>
              <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '1.1rem', textAlign: 'center', wordBreak: 'break-all', border: '1px dashed #ccc' }}>
                {setupData.secretCode || '...'}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>設備名稱（可選）</label>
            <input type="text" value={deviceName} onChange={e => setDeviceName(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '1rem' }} placeholder="例如: 我的 iPhone" disabled={loading} />
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>驗證碼</label>
            <input type="text" value={totpCode} onChange={e => setTotpCode(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="輸入驗證器應用顯示的 6 位數驗證碼" maxLength={6} disabled={loading} />
          </div>
          <button type="button" onClick={handleVerify} style={{ width: '100%', padding: '0.75rem', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem' }} disabled={!totpCode || loading}>
            {loading ? '驗證中...' : '驗證並啟用'}
          </button>
          <button type="button" onClick={() => router.push('/login')} style={{ width: '100%', padding: '0.75rem', backgroundColor: '#f5f5f5', color: '#666', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }} disabled={loading}>
            返回
          </button>
        </div>
      </div>
    </>
  );
} 