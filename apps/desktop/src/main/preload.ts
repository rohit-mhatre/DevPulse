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
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  
  // Listen for status updates
  onStatusUpdate: (callback: (status: any) => void) => {
    ipcRenderer.on('status-update', (_event, status) => callback(status));
  }
});

// Expose electron API for dashboard when running in desktop app
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
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
      openExternal: (url: string) => Promise<void>;
      onStatusUpdate: (callback: (status: any) => void) => void;
    };
  }
}
