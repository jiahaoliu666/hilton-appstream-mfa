import Link from 'next/link';

export default function Custom404() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#f5f5f5',
      fontFamily: 'Arial, sans-serif',
    }}>
      <h1 style={{ fontSize: '4rem', color: '#1976d2', marginBottom: '1rem' }}>404</h1>
      <h2 style={{ fontSize: '2rem', color: '#333', marginBottom: '1.5rem' }}>找不到您要的頁面</h2>
      <p style={{ color: '#888', marginBottom: '2rem' }}>
        很抱歉，您訪問的頁面不存在或已被移除。
      </p>
      <Link href="/">
        <button style={{
          padding: '0.75rem 2rem',
          backgroundColor: '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}>
          返回首頁
        </button>
      </Link>
    </div>
  );
} 