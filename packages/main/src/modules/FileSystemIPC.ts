import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { AppModule } from '../AppModule.js';

export function fileSystemIPC(): AppModule {
  return {
    enable() {
      ipcMain.handle('dialog:openDirectory', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
          properties: ['openDirectory'],
        });
        if (canceled) return null;
        return filePaths[0];
      });

      ipcMain.handle('fs:readDirectory', async (_, dirPath: string) => {
        try {
          const files = await fs.readdir(dirPath, { withFileTypes: true });
          // Only return markdown files
          return files
            .filter(f => f.isFile() && f.name.endsWith('.md'))
            .map(f => ({
              name: f.name,
              path: path.join(dirPath, f.name),
            }));
        } catch (e) {
          console.error('Failed to read directory', e);
          return [];
        }
      });

      ipcMain.handle('fs:readFile', async (_, filePath: string) => {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          return content;
        } catch (e) {
          console.error('Failed to read file', e);
          return null;
        }
      });

      ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
        try {
          await fs.writeFile(filePath, content, 'utf-8');
          return true;
        } catch (e) {
          console.error('Failed to write file', e);
          return false;
        }
      });

      ipcMain.handle('export:pdf', async (event, filePath: string) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return false;

        try {
          const pdfData = await win.webContents.printToPDF({
            printBackground: true,
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
          });

          await fs.writeFile(filePath, pdfData);
          return true;
        } catch (e) {
          console.error('Failed to export PDF', e);
          return false;
        }
      });

      ipcMain.handle('dialog:savePdf', async () => {
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: 'Export to PDF',
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
        });
        if (canceled) return null;
        return filePath;
      });

      ipcMain.handle('dialog:saveMd', async () => {
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: 'New Markdown File',
          filters: [{ name: 'Markdown', extensions: ['md'] }],
        });
        if (canceled) return null;
        return filePath;
      });
    },
  };
}
