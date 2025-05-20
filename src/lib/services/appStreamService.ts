import apiClient from '../api/apiClient';

export interface StreamingResponse {
  streamingUrl: string;
}

export interface CredentialsResponse {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

export interface IdentityResponse {
  IdentityId: string;
}

export const appStreamService = {
  // 獲取身份 ID
  getId: async (identityPoolId: string, loginProvider: string, idToken: string): Promise<IdentityResponse> => {
    try {
      const response = await apiClient.post('/api/getId', {
        IdentityPoolId: identityPoolId,
        LoginProvider: loginProvider,
        IdToken: idToken
      });
      return response.data;
    } catch (error) {
      console.error('獲取身份 ID 失敗:', error);
      throw error;
    }
  },

  // 獲取臨時憑證
  getCredentials: async (identityId: string, logins: { [key: string]: string }): Promise<CredentialsResponse> => {
    try {
      const response = await apiClient.post('/api/getCredentials', {
        IdentityId: identityId,
        Logins: logins
      });
      return response.data;
    } catch (error) {
      console.error('獲取臨時憑證失敗:', error);
      throw error;
    }
  },

  // 獲取 Web 串流 URL
  getWebStreamingURL: async (email: string, credentials: any): Promise<StreamingResponse> => {
    try {
      const response = await apiClient.post('/api/getWebStreamingURL', {
        email,
        credentials
      });
      return response.data;
    } catch (error) {
      console.error('獲取 Web 串流 URL 失敗:', error);
      throw error;
    }
  },

  // 獲取 APP 串流 URL
  getAppStreamingURL: async (email: string, credentials: any): Promise<StreamingResponse> => {
    try {
      const response = await apiClient.post('/api/getAppStreamingURL', {
        email,
        credentials
      });
      return response.data;
    } catch (error) {
      console.error('獲取 APP 串流 URL 失敗:', error);
      throw error;
    }
  }
}; 