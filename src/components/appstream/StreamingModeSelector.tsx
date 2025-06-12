import { useState } from 'react';
import { useCognito } from '@/lib/hooks/useCognito';
import { appStreamWebService } from '@/lib/services/appStreamWebService';
import { appStreamAppService } from '@/lib/services/appStreamAppService';
import { CognitoUserSession } from 'amazon-cognito-identity-js';
import { showError } from '@/utils/notification';

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

  const getUserEmail = async () => {
    return new Promise<string>((resolve, reject) => {
      if (!user) return reject('用戶不存在');
      user.getUserAttributes((err, attributes) => {
        if (err) return reject('無法取得用戶屬性');
        const emailAttr = attributes?.find(attr => attr.getName() === 'email');
        if (!emailAttr) return reject('找不到 email 屬性');
        resolve(emailAttr.getValue());
      });
    });
  };

  const handleWebMode = async () => {
    try {
      setIsLoading(true);
      const credentials = await getCredentials();
      const email = await getUserEmail();
      if (email.length > 32) throw new Error('email 長度超過 32 字元，無法作為 UserId');
      const response = await appStreamWebService.getWebStreamingURL(email, credentials);
      window.open(response.streamingUrl, '_blank');
    } catch (error) {
      console.error('Web 模式啟動失敗:', error);
      showError('Web 模式啟動失敗，請通知工程師團隊協助處理');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppMode = async () => {
    try {
      setIsLoading(true);
      const credentials = await getCredentials();
      const email = await getUserEmail();
      if (email.length > 32) throw new Error('email 長度超過 32 字元，無法作為 UserId');
      const response = await appStreamAppService.getAppStreamingURL(email, credentials);

      // 先 base64 encode streamingUrl
      const base64Url = btoa(response.streamingUrl);
      // 用 amazonappstream: 協定開頭
      const appstreamClientUrl = `amazonappstream:${base64Url}`;

      // 直接進行協定跳轉
      window.location.href = appstreamClientUrl;
    } catch (error) {
      console.error('App 模式啟動失敗:', error);
      showError('App 模式啟動失敗，請通知工程師團隊協助處理');
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