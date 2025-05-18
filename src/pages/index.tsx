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
      <p style={{ marginBottom: '2rem' }}>您已成功登入</p>
      
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
