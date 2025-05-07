import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Home() {
  const { logout, isAuthenticated, getUserMfaSettings } = useAuth();
  const router = useRouter();
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(false);

  useEffect(() => {
    const checkMfaStatus = async () => {
      if (isAuthenticated) {
        try {
          const result = await getUserMfaSettings();
          if (result.success) {
            setMfaEnabled(result.enabled || false);
          }
        } catch (error) {
          console.error('Failed to get MFA settings:', error);
        }
      }
    };

    checkMfaStatus();
  }, [isAuthenticated, getUserMfaSettings]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleMfaSetup = () => {
    router.push('/mfa-setup');
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>Hello World!</h1>
      <p style={{ marginBottom: '1rem' }}>您已成功登入</p>
      
      <div style={{ 
        padding: '1.5rem',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        marginBottom: '2rem',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>帳戶安全</h2>
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: 'white',
          borderRadius: '4px'
        }}>
          <div>
            <p style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>雙重驗證 (MFA)</p>
            <p style={{ fontSize: '0.875rem', color: '#666' }}>
              {mfaEnabled 
                ? '已啟用 - 您的帳戶受到額外的保護' 
                : '未啟用 - 建議啟用以增強安全性'}
            </p>
          </div>
          <button
            onClick={handleMfaSetup}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: mfaEnabled ? '#2e7d32' : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 'bold'
            }}
          >
            {mfaEnabled ? '管理' : '設置'}
          </button>
        </div>
      </div>
      
      <button 
        onClick={handleLogout}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: 'bold'
        }}
      >
        登出
      </button>
    </div>
  );
}
