import { useState, useRef, useEffect } from 'react';
import Editor from './Editor';
import { Sidebar } from './Sidebar';
import { fs } from '@app/preload';

interface FileInfo {
  name: string;
  path: string;
}

function App() {
  const [activeFile, setActiveFile] = useState<FileInfo | null>(null);
  const [content, setContent] = useState<string>('');
  const [autoSave, setAutoSave] = useState(true);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flushSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (activeFile && content && autoSave) {
      fs.writeFile(activeFile.path, content);
    }
  };

  const handleFileSelect = async (file: FileInfo) => {
    // Flush pending save for previous file before switching
    flushSave();

    setActiveFile(file);
    const text = await fs.readFile(file.path);
    setContent(text || '');
  };

  const handleContentChange = (newContent: string) => {
    // Only update and trigger save if the content actually changed to avoid loop
    if (newContent !== content) {
      setContent(newContent);

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
    </div>
  );
}

export default App;