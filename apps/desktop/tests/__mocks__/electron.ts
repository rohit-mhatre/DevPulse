/**
 * Mock for Electron modules used in tests
 */

export const app = {
  getPath: jest.fn((name: string) => {
    switch (name) {
      case 'userData':
        return '/test/userData';
      case 'home':
        return '/test/home';
      default:
        return `/test/${name}`;
    }
  }),
  on: jest.fn(),
  whenReady: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn(),
  isReady: jest.fn().mockReturnValue(true)
};

export const BrowserWindow = jest.fn().mockImplementation(() => ({
  loadFile: jest.fn(),
  loadURL: jest.fn(),
  on: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  close: jest.fn(),
  focus: jest.fn(),
  webContents: {
    send: jest.fn(),
    on: jest.fn(),
    openDevTools: jest.fn()
  }
}));

export const powerMonitor = {
  on: jest.fn(),
  getSystemIdleTime: jest.fn().mockReturnValue(0),
  getSystemIdleState: jest.fn().mockReturnValue('active')
};

export const systemPreferences = {
  getMediaAccessStatus: jest.fn().mockReturnValue('granted'),
  askForMediaAccess: jest.fn().mockResolvedValue(true)
};

export const Menu = {
  setApplicationMenu: jest.fn(),
  buildFromTemplate: jest.fn()
};

export const Tray = jest.fn().mockImplementation(() => ({
  setToolTip: jest.fn(),
  setContextMenu: jest.fn(),
  on: jest.fn(),
  destroy: jest.fn()
}));

export const nativeImage = {
  createFromPath: jest.fn(),
  createFromDataURL: jest.fn()
};

export const shell = {
  openExternal: jest.fn(),
  openPath: jest.fn(),
  showItemInFolder: jest.fn()
};

export const ipcMain = {
  on: jest.fn(),
  handle: jest.fn(),
  removeAllListeners: jest.fn()
};

export const ipcRenderer = {
  send: jest.fn(),
  invoke: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn()
};

// Additional mocks for testing
export const mockElectronStore = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  has: jest.fn().mockReturnValue(false),
  size: 0
};