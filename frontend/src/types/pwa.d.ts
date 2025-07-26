/// <reference types="vite/client" />

declare module 'virtual:pwa-register/react' {
  export interface UpdateServiceWorkerOptions {
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
  }

  export function useRegisterSW(options?: UpdateServiceWorkerOptions): {
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}
