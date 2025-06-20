import { useEffect, useState } from 'react';
import { appStreamService } from '@/lib/services/appStreamService';

interface SystemStatusProps {
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  };
}

export const SystemStatus = ({ credentials }: SystemStatusProps) => {
  const [fleetStatus, setFleetStatus] = useState<string>('查詢中...');
  const [color, setColor] = useState<string>('bg-gray-400');

  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const fleet = await appStreamService.describeFleets(credentials);
        if (!isMounted) return;
        const status = fleet?.State || 'UNKNOWN';
        setFleetStatus(status);
        switch (status) {
          case 'RUNNING':
            setColor('bg-green-500');
            break;
          case 'STARTING':
            setColor('bg-yellow-500');
            break;
          case 'STOPPING':
            setColor('bg-yellow-500');
            break;
          case 'STOPPED':
            setColor('bg-red-500');
            break;
          default:
            setColor('bg-gray-400');
        }
      } catch (e) {
        setFleetStatus('查詢失敗');
        setColor('bg-gray-400');
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // 每 10 秒刷新
    return () => { isMounted = false; clearInterval(interval); };
  }, [credentials]);

  // 狀態中文對照
  const statusMap: Record<string, string> = {
    RUNNING: '運作中',
    STARTING: '啟動中',
    STOPPING: '停止中',
    STOPPED: '已停止',
    UNKNOWN: '未知',
    '查詢失敗': '查詢失敗',
    '查詢中...': '查詢中...'
  };

  return (
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-medium text-gray-500">當前機器狀態</h4>
      <div className="flex items-center ml-2">
        <div className={`w-3 h-3 rounded-full mr-2 ${color}`}></div>
        <span className="text-lg font-semibold">
          {statusMap[fleetStatus] || fleetStatus}
        </span>
      </div>
    </div>
  );
}; 