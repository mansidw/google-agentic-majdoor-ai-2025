import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { usePWAStatus } from '../hooks/usePWAStatus';
import { Badge } from './ui/badge';

const OfflineIndicator: React.FC = () => {
  const { isOnline } = usePWAStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge variant="destructive" className="flex items-center gap-2 py-2 px-3">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">Offline</span>
      </Badge>
    </div>
  );
};

export default OfflineIndicator;
