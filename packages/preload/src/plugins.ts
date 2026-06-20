import { ipcRenderer } from 'electron';

export const plugins = {
  list: () => ipcRenderer.invoke('plugin:list'),
  openManager: () => ipcRenderer.invoke('plugin:openManager'),
  importFile: () => ipcRenderer.invoke('plugin:importFile'),
  delete: (fileName: string) => ipcRenderer.invoke('plugin:delete', fileName),
};