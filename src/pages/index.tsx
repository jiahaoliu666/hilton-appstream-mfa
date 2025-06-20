import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { CognitoUserPool } from 'amazon-cognito-identity-js';
import { cognitoConfig } from '@/lib/config/cognito';
import { StreamingModeSelector } from '@/components/appstream/StreamingModeSelector';
import { showError, showSuccess } from '@/utils/notification';
import { SystemStatus } from '@/components/dashboard/SystemStatus';
import { UserProfile } from '@/components/dashboard/UserProfile';
import Head from 'next/head';

const userPool = new CognitoUserPool({
  UserPoolId: cognitoConfig.userPoolId,
  ClientId: cognitoConfig.clientId
});

export default function Home() {
  const { logout, getUserMfaSettings, user, email, setEmail } = useAuth();
  const router = useRouter();
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (user && !email) {
      user.getSession((err: Error | null, session: any) => {
        if (!err && session && session.isValid()) {
          user.getUserAttributes((err2, attributes) => {
            console.log('getUserAttributes', err2, attributes);
            if (!err2 && attributes) {
              const emailAttr = attributes.find(attr => attr.getName() === 'email');
              if (emailAttr) {
                setEmail(emailAttr.getValue());
                if (typeof window !== 'undefined') {
                  localStorage.setItem('cognito_email', emailAttr.getValue());
                }
              }
            }
          });
        } else {
          console.log('getSession error or invalid:', err);
        }
      });
    }
  }, [user, email, setEmail]);

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

  const handleStatusChange = (status: string) => {
    if (status === 'unstable') {
      showError('網路連線不穩定，請檢查您的網路狀態');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">載入中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Hilton AppStream</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Hilton AppStream</h1>
            <p className="text-gray-600">歡迎使用 Hilton AppStream 串流服務</p>
          </div>

          <UserProfile />
          
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <StreamingModeSelector />
            
            <div className="mt-6">
              <button
                onClick={handleLogout}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
