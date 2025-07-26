import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { useRegisterSW } from 'virtual:pwa-register/react';

const PWAUpdatePrompt: React.FC = () => {
  const [showReload, setShowReload] = useState(false);
  
  const {
    updateServiceWorker,
  } = useRegisterSW({
    onNeedRefresh() {
      setShowReload(true);
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
    setShowReload(false);
  };

  const handleDismiss = () => {
    setShowReload(false);
  };

  if (!showReload) {
    return null;
  }

  return (
    <Card className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-sm shadow-lg border-2 bg-blue-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-blue-900">
              App Update Available
            </h3>
            <p className="text-xs text-blue-700 mt-1">
              A new version is ready. Refresh to get the latest features.
            </p>
            <div className="flex space-x-2 mt-3">
              <Button
                onClick={handleUpdate}
                size="sm"
                className="flex-1 text-xs bg-blue-600 hover:bg-blue-700"
              >
                Update Now
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
                className="text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Later
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PWAUpdatePrompt;
