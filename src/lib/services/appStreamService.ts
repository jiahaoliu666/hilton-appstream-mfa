import { AppStreamClient, CreateStreamingURLCommand, DescribeFleetsCommand } from "@aws-sdk/client-appstream";
import { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } from "@aws-sdk/client-cognito-identity";
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
      const client = new CognitoIdentityClient({ region: process.env.NEXT_PUBLIC_AWS_REGION });
      const command = new GetIdCommand({
        IdentityPoolId: identityPoolId,
        Logins: {
          [loginProvider]: idToken
        }
      });
      const response = await client.send(command);
      return { IdentityId: response.IdentityId || '' };
    } catch (error) {
      console.error('獲取身份 ID 失敗:', error);
      throw error;
    }
  },

  // 獲取臨時憑證
  getCredentials: async (identityId: string, logins: { [key: string]: string }): Promise<CredentialsResponse> => {
    try {
      const client = new CognitoIdentityClient({ region: process.env.NEXT_PUBLIC_AWS_REGION });
      const command = new GetCredentialsForIdentityCommand({
        IdentityId: identityId,
        Logins: logins
      });
      const response = await client.send(command);
      return {
        accessKeyId: response.Credentials?.AccessKeyId || '',
        secretAccessKey: response.Credentials?.SecretKey || '',
        sessionToken: response.Credentials?.SessionToken || ''
      };
    } catch (error) {
      console.error('獲取臨時憑證失敗:', error);
      throw error;
    }
  },

  // 獲取 Web 串流 URL
  getWebStreamingURL: async (email: string, credentials: CredentialsResponse): Promise<StreamingResponse> => {
    try {
      const client = new AppStreamClient({
        region: process.env.NEXT_PUBLIC_AWS_REGION,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken
        }
      });

      const command = new CreateStreamingURLCommand({
        StackName: process.env.NEXT_PUBLIC_APPSTREAM_STACK_NAME,
        FleetName: process.env.NEXT_PUBLIC_APPSTREAM_FLEET_NAME,
        UserId: email,
        ApplicationId: process.env.NEXT_PUBLIC_APPSTREAM_APPLICATION_ID,
        Validity: 3600 // URL 有效期為 1 小時
      });

      const response = await client.send(command);
      return { streamingUrl: response.StreamingURL || '' };
    } catch (error) {
      console.error('獲取 Web 串流 URL 失敗:', error);
      throw error;
    }
  },

  // 獲取 APP 串流 URL
  getAppStreamingURL: async (email: string, credentials: CredentialsResponse): Promise<StreamingResponse> => {
    try {
      const client = new AppStreamClient({
        region: process.env.NEXT_PUBLIC_AWS_REGION,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken
        }
      });

      const command = new CreateStreamingURLCommand({
        StackName: process.env.NEXT_PUBLIC_APPSTREAM_STACK_NAME,
        FleetName: process.env.NEXT_PUBLIC_APPSTREAM_FLEET_NAME,
        UserId: email,
        ApplicationId: process.env.NEXT_PUBLIC_APPSTREAM_APPLICATION_ID,
        Validity: 3600 // URL 有效期為 1 小時
      });

      const response = await client.send(command);
      return { streamingUrl: response.StreamingURL || '' };
    } catch (error) {
      console.error('獲取 APP 串流 URL 失敗:', error);
      throw error;
    }
  },

  // 查詢 Fleet 狀態
  describeFleets: async (credentials: CredentialsResponse): Promise<any> => {
    try {
      const client = new AppStreamClient({
        region: process.env.NEXT_PUBLIC_AWS_REGION,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken
        }
      });
      const command = new DescribeFleetsCommand({
        Names: [process.env.NEXT_PUBLIC_APPSTREAM_FLEET_NAME!]
      });
      const response = await client.send(command);
      return response.Fleets && response.Fleets.length > 0 ? response.Fleets[0] : null;
    } catch (error) {
      console.error('查詢 Fleet 狀態失敗:', error);
      throw error;
    }
  }
}; 