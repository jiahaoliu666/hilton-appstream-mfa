import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/router';

export default function Home() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>Hello World!</h1>
      <p style={{ marginBottom: '1rem' }}>您已成功登入</p>
      
      <button 
        onClick={handleLogout}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        登出
      </button>
    </div>
  );
}
