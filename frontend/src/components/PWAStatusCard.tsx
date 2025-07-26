import React from 'react';
import { Smartphone, Download, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { usePWAStatus } from '../hooks/usePWAStatus';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface PWAStatusCardProps {
  className?: string;
}

const PWAStatusCard: React.FC<PWAStatusCardProps> = ({ className }) => {
  const { isOnline, isInstalled, isInstallable } = usePWAStatus();

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          App Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Connection</span>
          <Badge variant={isOnline ? "default" : "destructive"} className="flex items-center gap-1">
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Installation</span>
          <Badge 
            variant={isInstalled ? "default" : isInstallable ? "secondary" : "outline"}
            className="flex items-center gap-1"
          >
            {isInstalled ? (
              <>
                <CheckCircle className="w-3 h-3" />
                Installed
              </>
            ) : isInstallable ? (
              <>
                <Download className="w-3 h-3" />
                Available
              </>
            ) : (
              "Browser"
            )}
          </Badge>
        </div>

        {isInstalled && (
          <div className="text-xs text-green-600 mt-2">
            ✅ Running as installed app
          </div>
        )}
        
        {!isInstalled && isInstallable && (
          <div className="text-xs text-blue-600 mt-2">
            💡 You can install this app for better experience
          </div>
        )}
        
        {!isOnline && (
          <div className="text-xs text-orange-600 mt-2">
            📱 Some features may be limited offline
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PWAStatusCard;
