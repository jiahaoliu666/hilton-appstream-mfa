import { useAuth } from '@/components/auth/AuthContext';
import { useState, useEffect } from 'react';
import { SystemStatus } from './SystemStatus';
import { appStreamService } from '@/lib/services/appStreamService';

export const UserProfile = () => {
  const { email, user, isAuthenticated } = useAuth();
  const [lastLoginTime, setLastLoginTime] = useState<string>('');
  const [credentials, setCredentials] = useState<any>(null);
  const [credentialError, setCredentialError] = useState<string>('');

  useEffect(() => {
    // 模擬獲取上次登入時間
    const now = new Date();
    setLastLoginTime(now.toLocaleString('zh-TW'));
  }, []);

  useEffect(() => {
    // 取得 AWS credentials
    const fetchCredentials = async () => {
      if (!user || !isAuthenticated) return;
      try {
        const loginProvider = `cognito-idp.${process.env.NEXT_PUBLIC_COGNITO_REGION}.amazonaws.com/${process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID}`;
        const session = await new Promise<any>((resolve, reject) => {
          user.getSession((err: Error | null, session: any) => {
            if (err) reject(err);
            else resolve(session);
          });
        });
        const idToken = session.getIdToken().getJwtToken();
        const identityResponse = await appStreamService.getId(
          process.env.NEXT_PUBLIC_IDENTITY_POOL_ID || '',
          loginProvider,
          idToken
        );
        const credentialsResponse = await appStreamService.getCredentials(
          identityResponse.IdentityId,
          { [loginProvider]: idToken }
        );
        setCredentials(credentialsResponse);
        setCredentialError('');
      } catch (err) {
        setCredentials(null);
        setCredentialError('系統設定有誤，請聯絡工程團隊協助處理。');
      }
    };
    fetchCredentials();
  }, [user, isAuthenticated]);

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center justify-between max-w-xl mx-auto">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-medium">
            {email ? `${email.split('@')[0]}，歡迎回來` : '歡迎回來'}
          </h3>
        </div>
      </div>
      <div className="ml-4">
        {credentialError && (
          <div className="text-red-500 text-sm font-medium">{credentialError}</div>
        )}
        {credentials && <SystemStatus credentials={credentials} />}
      </div>
    </div>
  );
}; 