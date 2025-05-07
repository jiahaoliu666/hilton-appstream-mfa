/**
 * AWS Cognito 配置
 */
export const cognitoConfig = {
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
  region: process.env.NEXT_PUBLIC_COGNITO_REGION || 'ap-southeast-1',
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Hilton AppStream',
};

// 檢查 Cognito 配置是否有效
export const isCognitoConfigured = (): boolean => {
  return !!(cognitoConfig.userPoolId && cognitoConfig.clientId);
}; 