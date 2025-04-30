import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/components/auth/AuthContext';
import Head from 'next/head';
import { showError } from '@/lib/utils/notification';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login, isAuthenticated, loading, error, newPasswordRequired } = useAuth();

  // 如果用戶已經登入，重定向到首頁
  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.push('/');
    }
    
    // 如果需要設置新密碼，重定向到設置密碼頁面
    if (newPasswordRequired && !loading) {
      router.push('/change-password');
    }
  }, [isAuthenticated, newPasswordRequired, router, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      showError('請輸入電子郵件和密碼');
      return;
    }

    try {
      const result = await login(username, password);
      
      if (result.success) {
        router.push('/');
      } else if (result.newPasswordRequired) {
        router.push('/change-password');
      }
    } catch (err) {
      // 移除重複的錯誤顯示
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <Head>
        <title>Hilton AppStream 系統登入</title>
        <meta name="description" content="AppStream 登入系統<" />
      </Head>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>登入</h1>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold' 
              }}>
                電子郵件
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
                placeholder="請輸入您的電子郵件"
                disabled={loading}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold' 
              }}>
                密碼
              </label>
              <div style={{ 
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    paddingRight: '2.5rem', // 為圖標留出空間
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                  placeholder="請輸入您的密碼"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    background: 'none',
                    border: 'none',
                    padding: '0.25rem',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  {showPassword ? (
                    // 隱藏密碼圖標
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    // 顯示密碼圖標
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
              disabled={loading}
            >
              {loading ? '登入中...' : '登入'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
} 