import { ipcMain, app, BrowserWindow, dialog } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { AppModule } from '../AppModule.js';

export function pluginManagerIPC(): AppModule {
  let pluginWindow: BrowserWindow | null = null;
  const pluginsDir = path.join(app.getPath('userData'), 'plugins');

  // Ensure plugins directory exists
  fs.mkdir(pluginsDir, { recursive: true }).catch(console.error);

  return {
    enable() {
      ipcMain.handle('plugin:list', async () => {
        try {
          const files = await fs.readdir(pluginsDir, { withFileTypes: true });
          const plugins = await Promise.all(
            files
              .filter(f => f.isFile() && f.name.endsWith('.js'))
              .map(async f => {
                const code = await fs.readFile(path.join(pluginsDir, f.name), 'utf-8');
                return { name: f.name, code };
              })
          );
          return plugins;
        } catch (e) {
          console.error('Failed to read plugins directory', e);
          return [];
        }
      });

      ipcMain.handle('plugin:openManager', async (event) => {
        if (pluginWindow) {
          pluginWindow.focus();
          return true;
        }

        const parentWin = BrowserWindow.fromWebContents(event.sender);

        // Setup simple window for plugin manager pointing to hash route
        pluginWindow = new BrowserWindow({
          parent: parentWin || undefined,
          width: 600,
          height: 500,
          title: 'Plugin Manager',
          webPreferences: {
            preload: path.join(app.getAppPath(), 'packages/preload/dist/index.mjs'),
            contextIsolation: true,
            nodeIntegration: false,
          },
        });

        // Use the same URL as the main window but with a hash route
        const pageUrl = import.meta.env.DEV
          ? `${import.meta.env.VITE_DEV_SERVER_URL}#/plugins`
          : new URL('../renderer/dist/index.html#/plugins', 'file://' + __dirname).toString();

        await pluginWindow.loadURL(pageUrl);

        pluginWindow.on('closed', () => {
          pluginWindow = null;
        });

        return true;
      });

      ipcMain.handle('plugin:importFile', async () => {
         const { canceled, filePaths } = await dialog.showOpenDialog({
           title: 'Import Plugin',
           properties: ['openFile'],
           filters: [{ name: 'JavaScript', extensions: ['js'] }],
         });

         if (canceled || filePaths.length === 0) return false;

         try {
           const srcPath = filePaths[0];
           const fileName = path.basename(srcPath);
           const destPath = path.join(pluginsDir, fileName);
           await fs.copyFile(srcPath, destPath);
           return true;
         } catch (e) {
           console.error('Failed to import plugin', e);
           return false;
         }
      });

      ipcMain.handle('plugin:delete', async (_, fileName: string) => {
        try {
           await fs.unlink(path.join(pluginsDir, fileName));
           return true;
        } catch (e) {
           console.error('Failed to delete plugin', e);
           return false;
        }
      });
    },
  };
}