import { useState, useEffect } from 'react';

interface SystemStatusProps {
  onStatusChange?: (status: string) => void;
}

export const SystemStatus = ({ onStatusChange }: SystemStatusProps) => {
  const [sessionTime, setSessionTime] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<'stable' | 'unstable' | 'disconnected'>('stable');

  useEffect(() => {
    // 更新會話時間
    const timer = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);

    // 模擬連接狀態檢查
    const statusCheck = setInterval(() => {
      const random = Math.random();
      if (random > 0.95) {
        setConnectionStatus('unstable');
        onStatusChange?.('unstable');
      } else {
        setConnectionStatus('stable');
        onStatusChange?.('stable');
      }
    }, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(statusCheck);
    };
  }, [onStatusChange]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-medium text-gray-500">當前機器狀態</h4>
      <div className="flex items-center ml-2">
        <div className={`w-3 h-3 rounded-full mr-2 ${
          connectionStatus === 'stable' ? 'bg-green-500' :
          connectionStatus === 'unstable' ? 'bg-yellow-500' :
          'bg-red-500'
        }`}></div>
        <span className="text-lg font-semibold">
          {connectionStatus === 'stable' ? '穩定' :
           connectionStatus === 'unstable' ? '不穩定' :
           '已斷線'}
        </span>
      </div>
    </div>
  );
}; 