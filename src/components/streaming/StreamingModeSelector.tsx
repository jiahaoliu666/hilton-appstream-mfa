import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { appStreamService } from '@/lib/services/appStreamService';
import { showError, showSuccess } from '@/utils/notification';
import { cognitoConfig } from '@/lib/config/cognito';

export const StreamingModeSelector = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const getCredentials = async () => {
    if (!user) {
      throw new Error('請先登入');
    }

    const email = user.getUsername();
    const session = await user.getSignInUserSession();
    if (!session) {
      throw new Error('無法獲取會話信息');
    }

    const idToken = session.getIdToken().getJwtToken();
    const loginProvider = `cognito-idp.${cognitoConfig.region}.amazonaws.com/${cognitoConfig.userPoolId}`;

    // 獲取身份 ID
    const identityResponse = await appStreamService.getId(
      process.env.NEXT_PUBLIC_IDENTITY_POOL_ID || '',
      loginProvider,
      idToken
    );

    // 獲取臨時憑證
    const credentialsResponse = await appStreamService.getCredentials(
      identityResponse.IdentityId,
      { [loginProvider]: idToken }
    );

    return { email, credentials: credentialsResponse };
  };

  const handleWebMode = async () => {
    if (!user) {
      showError('請先登入');
      return;
    }

    setLoading(true);
    try {
      const { email, credentials } = await getCredentials();
      const response = await appStreamService.getWebStreamingURL(email, credentials);

      // 在新視窗中打開串流 URL
      window.open(response.streamingUrl, '_blank');
      showSuccess('正在開啟 Web 串流...');
    } catch (error) {
      console.error('Web 模式啟動失敗:', error);
      showError('啟動 Web 模式失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleAppMode = async () => {
    if (!user) {
      showError('請先登入');
      return;
    }

    setLoading(true);
    try {
      const { email, credentials } = await getCredentials();
      const response = await appStreamService.getAppStreamingURL(email, credentials);

      // 使用自定義協議啟動本地應用
      const appUrl = `hilton-appstream://${response.streamingUrl}`;
      window.location.href = appUrl;
      showSuccess('正在啟動 APP 模式...');
    } catch (error) {
      console.error('APP 模式啟動失敗:', error);
      showError('啟動 APP 模式失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 w-full max-w-md mx-auto">
      <button
        onClick={handleWebMode}
        disabled={loading}
        className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '處理中...' : 'Web 模式'}
      </button>
      
      <button
        onClick={handleAppMode}
        disabled={loading}
        className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '處理中...' : 'APP 模式'}
      </button>
    </div>
  );
}; 