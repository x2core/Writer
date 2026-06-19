import { ipcRenderer } from 'electron';

export const fs = {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  readDirectory: (dirPath: string) => ipcRenderer.invoke('fs:readDirectory', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  exportPdf: (filePath: string) => ipcRenderer.invoke('export:pdf', filePath),
  savePdfDialog: () => ipcRenderer.invoke('dialog:savePdf'),
  saveMdDialog: () => ipcRenderer.invoke('dialog:saveMd'),
};