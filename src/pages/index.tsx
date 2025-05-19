import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { CognitoUserPool } from 'amazon-cognito-identity-js';
import { cognitoConfig } from '@/lib/config/cognito';

const userPool = new CognitoUserPool({
  UserPoolId: cognitoConfig.userPoolId,
  ClientId: cognitoConfig.clientId
});

export default function Home() {
  const { logout, getUserMfaSettings } = useAuth();
  const router = useRouter();
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const user = userPool.getCurrentUser();
    if (user) {
      user.getSession((err: any, session: any) => {
        if (!err && session && session.isValid()) {
          setIsAuthenticated(true);
        } else {
          router.replace('/login');
        }
        setLoading(false);
      });
    } else {
      router.replace('/login');
      setLoading(false);
    }
  }, [router]);

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

  if (loading) {
    return <div>載入中...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

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
