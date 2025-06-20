import { useAuth } from '@/components/auth/AuthContext';
import { useState, useEffect } from 'react';

export const UserProfile = () => {
  const { email } = useAuth();
  const [lastLoginTime, setLastLoginTime] = useState<string>('');

  useEffect(() => {
    // 模擬獲取上次登入時間
    const now = new Date();
    setLastLoginTime(now.toLocaleString('zh-TW'));
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
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
          <p className="text-sm text-gray-500">上次登入時間：{lastLoginTime}</p>
        </div>
      </div>
    </div>
  );
}; 