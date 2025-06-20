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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <img src="/logo.png" alt="Hilton Logo" className="w-24 h-16 mx-auto mb-2 drop-shadow-md" />
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">Hilton AppStream</h1>
            <p className="text-lg text-gray-600">歡迎使用 Hilton AppStream 串流服務</p>
          </div>

          <UserProfile />
          
          <div className="bg-white/80 backdrop-blur-md py-6 px-6 shadow-2xl rounded-2xl sm:px-12 border border-gray-100 max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">選擇串流模式</h2>
            <StreamingModeSelector />
            <div className="mt-8">
              <button
                onClick={handleLogout}
                className="w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 transition-all duration-200"
              >
                登出
              </button>
            </div>
          </div>

          <footer className="mt-10 text-center text-gray-400 text-xs select-none">
            &copy; {new Date().getFullYear()} Hilton AppStream. All rights reserved.
          </footer>
        </div>
      </div>
    </>
  );
}
