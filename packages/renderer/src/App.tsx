import { useState, useRef, useEffect } from 'react';
import Editor from './Editor';
import { Sidebar } from './Sidebar';
import { fs } from '@app/preload';
import { coreAPI } from './pluginApi';
import type { MenuItem, ModalState } from './pluginApi';
import { plugins } from '@app/preload';

interface FileInfo {
  name: string;
  path: string;
}

function App() {
  const [activeFile, setActiveFile] = useState<FileInfo | null>(null);
  const [content, setContent] = useState<string>('');
  const [autoSave, setAutoSave] = useState(true);
  const [pluginMenus, setPluginMenus] = useState<Record<string, MenuItem[]>>({});
  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, title: '', content: '' });

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref tracking for API providers to avoid stale closures
  const activeFileRef = useRef<FileInfo | null>(null);
  const contentRef = useRef<string>('');

  useEffect(() => {
    activeFileRef.current = activeFile;
    contentRef.current = content;
  }, [activeFile, content]);

  useEffect(() => {
    // Connect React state to Core API
    coreAPI._setMenuCallback(setPluginMenus);
    coreAPI._setModalCallback(setModalState);
    coreAPI._setStateProviders(
      () => activeFileRef.current?.path || null,
      () => contentRef.current
    );

    // Initialize core menus
    coreAPI.addMenuItem('View', 'Plugin Manager', () => {
      plugins.openManager();
    });

    // Load user plugins dynamically
    const loadPlugins = async () => {
      const list = await plugins.list();
      for (const plugin of list) {
        try {
          // Convert code to Blob and import dynamically
          const blob = new Blob([plugin.code], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          const module = await import(/* @vite-ignore */ url);
          URL.revokeObjectURL(url);

          if (module.default && typeof module.default.activate === 'function') {
            module.default.activate(coreAPI);
            console.log(`Successfully loaded plugin: ${plugin.name}`);
          } else {
            console.warn(`Plugin ${plugin.name} is missing a default export with an activate() function.`);
          }
        } catch (err) {
          console.error(`Failed to load plugin ${plugin.name}:`, err);
        }
      }
    };

    loadPlugins();
  }, []);

  const flushSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (activeFile && content && autoSave) {
      coreAPI.emit('onBeforeSave', activeFile.path, content);
      fs.writeFile(activeFile.path, content);
    }
  };

  const handleFileSelect = async (file: FileInfo) => {
    // Flush pending save for previous file before switching
    flushSave();

    setActiveFile(file);
    const text = await fs.readFile(file.path);
    setContent(text || '');
    coreAPI.emit('onFileOpen', file.path);
  };

  const handleContentChange = (newContent: string) => {
    // Only update and trigger save if the content actually changed to avoid loop
    if (newContent !== content) {
      setContent(newContent);
      coreAPI.emit('onEditorChange', newContent);

      if (autoSave && activeFile) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          fs.writeFile(activeFile.path, newContent);
        }, 1000); // Debounce auto-save by 1 second
      }
    }
  };

  const handleExportPdf = async () => {
    const savePath = await fs.savePdfDialog();
    if (savePath) {
      await fs.exportPdf(savePath);
      // Could show a success toast here
    }
  };

  const handleNewFile = async () => {
    const savePath = await fs.saveMdDialog();
    if (savePath) {
      const fileName = savePath.split(/[/\\]/).pop() || 'Untitled.md';
      await fs.writeFile(savePath, '# New Document\n');
      handleFileSelect({ name: fileName, path: savePath });
    }
  };

  const handleSave = () => {
    if (activeFile && content) {
      fs.writeFile(activeFile.path, content);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, content]);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-neutral-900 font-sans transition-colors duration-300">
      {/* Top Menu Bar */}
      <div className="top-menu flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 text-sm">
        <div className="flex space-x-4">
          <div className="relative group">
            <button className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer py-1">
              File
            </button>
            <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-lg rounded-md hidden group-hover:block z-50">
              <button onClick={handleNewFile} className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-200">
                New File...
              </button>
              <button onClick={handleSave} className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-200">
                Save
              </button>
              <button onClick={handleExportPdf} className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-200">
                Export as PDF
              </button>

              {pluginMenus['File'] && pluginMenus['File'].map((item, idx) => (
                <button key={`file-plugin-${idx}`} onClick={item.onClick} className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-200">
                  {item.label}
                </button>
              ))}

              <div className="border-t border-gray-200 dark:border-neutral-700 my-1"></div>
              <label className="flex items-center w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="mr-2"
                />
                Auto-save
              </label>
            </div>
          </div>

          {/* Dynamic Plugin Menus (New Root Menus) */}
          {Object.entries(pluginMenus).map(([menuName, items]) => {
            if (menuName === 'File') return null; // Already injected above
            return (
              <div key={menuName} className="relative group">
                <button className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer py-1">
                  {menuName}
                </button>
                <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-lg rounded-md hidden group-hover:block z-50">
                  {items.map((item, idx) => (
                    <button key={`${menuName}-item-${idx}`} onClick={item.onClick} className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-200">
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

        </div>
        <div className="text-gray-400 dark:text-gray-500 text-xs truncate max-w-md">
          {activeFile ? activeFile.path : 'No file open'}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onFileSelect={handleFileSelect} activeFile={activeFile} />

        <div className="flex-1 overflow-y-auto">
          {activeFile ? (
             <Editor key={activeFile.path} content={content} onChange={handleContentChange} />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              Select a markdown file to start editing
            </div>
          )}
        </div>
      </div>

      {/* Global Plugin Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 shadow-xl rounded-lg w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-neutral-800">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{modalState.title}</h2>
              <button
                onClick={() => coreAPI.closeModal()}
                className="text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                &times;
              </button>
            </div>
            <div
              className="p-4 text-gray-700 dark:text-gray-300 overflow-y-auto max-h-[70vh]"
              dangerouslySetInnerHTML={{ __html: modalState.content }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;