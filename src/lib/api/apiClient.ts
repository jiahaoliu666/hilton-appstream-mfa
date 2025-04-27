import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';

// 創建一個API客戶端實例
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 請求攔截器
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // 在瀏覽器環境中從 localStorage 獲取認證令牌
    if (typeof window !== 'undefined') {
      try {
        // 這裡需要在實際應用中通過 useAuth 獲取令牌
        // 但由於攔截器在組件外部，因此這裡使用直接從 localStorage 獲取的方式
        const token = localStorage.getItem('cognito_id_token');
        
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error: unknown) {
        console.error('Error adding auth token to request:', error);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // 處理401未授權錯誤
    if (error.response?.status === 401) {
      // 如果在瀏覽器端
      if (typeof window !== 'undefined') {
        // 清除認證信息
        localStorage.removeItem('cognito_id_token');
        
        // 重定向到登入頁面
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient; 