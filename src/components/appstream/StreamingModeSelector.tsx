import { useState } from 'react';
import { useCognito } from '@/lib/hooks/useCognito';
import { appStreamWebService } from '@/lib/services/appStreamWebService';
import { appStreamAppService } from '@/lib/services/appStreamAppService';
import { CognitoUserSession } from 'amazon-cognito-identity-js';

export const StreamingModeSelector = () => {
  const { user, isAuthenticated } = useCognito();
  const [isLoading, setIsLoading] = useState(false);

  const getCredentials = async () => {
    if (!user || !isAuthenticated) {
      throw new Error('用戶未登入');
    }

    const loginProvider = `cognito-idp.${process.env.NEXT_PUBLIC_COGNITO_REGION}.amazonaws.com/${process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID}`;
    
    // 獲取當前會話
    const session = await new Promise<CognitoUserSession | null>((resolve, reject) => {
      user.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err) {
          reject(err);
        } else {
          resolve(session);
        }
      });
    });

    if (!session) {
      throw new Error('無法獲取會話');
    }

    const idToken = session.getIdToken().getJwtToken();

    if (!idToken) {
      throw new Error('無法獲取 ID Token');
    }

    const identityResponse = await appStreamWebService.getId(
      process.env.NEXT_PUBLIC_IDENTITY_POOL_ID || '',
      loginProvider,
      idToken
    );

    const credentialsResponse = await appStreamWebService.getCredentials(
      identityResponse.IdentityId,
      { [loginProvider]: idToken }
    );

    return credentialsResponse;
  };

  const handleWebMode = async () => {
    try {
      setIsLoading(true);
      const credentials = await getCredentials();
      const response = await appStreamWebService.getWebStreamingURL(user?.getUsername() || '', credentials);
      window.open(response.streamingUrl, '_blank');
    } catch (error) {
      console.error('Web 模式啟動失敗:', error);
      alert('Web 模式啟動失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppMode = async () => {
    try {
      setIsLoading(true);
      const credentials = await getCredentials();
      const response = await appStreamAppService.getAppStreamingURL(user?.getUsername() || '', credentials);
      window.location.href = response.streamingUrl;
    } catch (error) {
      console.error('App 模式啟動失敗:', error);
      alert('App 模式啟動失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 p-4">
      <h2 className="text-xl font-bold mb-4">選擇串流模式</h2>
      <button
        onClick={handleWebMode}
        disabled={isLoading || !isAuthenticated}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading ? '載入中...' : 'Web 模式'}
      </button>
      <button
        onClick={handleAppMode}
        disabled={isLoading || !isAuthenticated}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
      >
        {isLoading ? '載入中...' : 'App 模式'}
      </button>
    </div>
  );
}; 