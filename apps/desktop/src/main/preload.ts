// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// Expose API to renderer process for real data
contextBridge.exposeInMainWorld('devPulseAPI', {
  // Get real activity data
  getActivityStats: () => ipcRenderer.invoke('get-activity-stats'),
  getTodaysSummary: () => ipcRenderer.invoke('get-todays-summary'),
  getTrackingStatus: () => ipcRenderer.invoke('get-tracking-status'),
  getDashboardUrl: () => ipcRenderer.invoke('get-dashboard-url'),
  
  // Listen for status updates
  onStatusUpdate: (callback: (status: any) => void) => {
    ipcRenderer.on('status-update', (_event, status) => callback(status));
  }
});

// Type definitions for the exposed API
declare global {
  interface Window {
    devPulseAPI: {
      getActivityStats: () => Promise<any>;
      getTodaysSummary: () => Promise<any>;
      getTrackingStatus: () => Promise<any>;
      getDashboardUrl: () => Promise<string>;
      onStatusUpdate: (callback: (status: any) => void) => void;
    };
  }
}
