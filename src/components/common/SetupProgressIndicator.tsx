import React from 'react';

export type SetupStep = 'password' | 'mfa' | 'complete';

interface SetupProgressIndicatorProps {
  currentStep: SetupStep;
  isMfaRequired?: boolean;
}

const SetupProgressIndicator: React.FC<SetupProgressIndicatorProps> = ({ 
  currentStep,
  isMfaRequired = true // 預設MFA是必須的
}) => {
  const steps: { key: SetupStep; label: string }[] = [
    { key: 'password', label: '設置新密碼' },
    ...(isMfaRequired ? [{ key: 'mfa' as const, label: '雙重驗證' }] : []),
    { key: 'complete', label: '完成' }
  ];

  // 計算當前步驟的索引
  const currentIndex = steps.findIndex(step => step.key === currentStep);
  
  // 計算進度條的百分比
  const progressPercent = ((currentIndex) / (steps.length - 1)) * 100;

  return (
    <div style={{ 
      width: '100%', 
      marginBottom: '2rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        position: 'relative',
        marginBottom: '0.5rem',
        padding: '0 10px'
      }}>
        {/* 進度線 */}
        <div style={{ 
          position: 'absolute',
          top: '12px',
          left: '25px',
          right: '25px',
          height: '4px',
          backgroundColor: '#e0e0e0',
          zIndex: 1
        }}></div>
        
        {/* 已完成的進度 */}
        <div style={{ 
          position: 'absolute',
          top: '12px',
          left: '25px',
          width: `${progressPercent}%`,
          height: '4px',
          backgroundColor: '#1976d2',
          zIndex: 2,
          transition: 'width 0.3s ease-in-out'
        }}></div>

        {/* 步驟點 */}
        {steps.map((step, index) => {
          const isActive = index <= currentIndex;
          const isCurrentStep = index === currentIndex;
          
          return (
            <div 
              key={step.key} 
              style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                zIndex: 3,
                flex: 1
              }}
            >
              <div style={{ 
                width: '28px', 
                height: '28px', 
                borderRadius: '50%',
                backgroundColor: isActive ? '#1976d2' : '#e0e0e0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                fontWeight: 'bold',
                boxShadow: isCurrentStep ? '0 0 0 4px rgba(25, 118, 210, 0.2)' : 'none',
                transition: 'all 0.2s ease-in-out',
                marginBottom: '0.5rem'
              }}>
                {isActive ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span style={{ 
                fontSize: '0.875rem',
                fontWeight: isCurrentStep ? 'bold' : 'normal',
                color: isCurrentStep ? '#1976d2' : isActive ? '#333' : '#999',
                textAlign: 'center'
              }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* 當前步驟說明 */}
      <div style={{ 
        textAlign: 'center',
        fontSize: '0.875rem',
        color: '#666',
        marginTop: '1rem'
      }}>
        {currentStep === 'password' && (
          <p>首次登入請設置一個安全的新密碼以繼續使用系統</p>
        )}
        {currentStep === 'mfa' && (
          <p>設置雙重驗證以提高帳號安全性</p>
        )}
        {currentStep === 'complete' && (
          <p>您已完成所有安全設置，可以開始使用系統</p>
        )}
      </div>
    </div>
  );
};

export default SetupProgressIndicator; 