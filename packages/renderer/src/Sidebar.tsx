import { useState, useEffect } from 'react';
import { fs } from '@app/preload';
import { FolderOpen, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

interface FileInfo {
  name: string;
  path: string;
}

interface SidebarProps {
  onFileSelect: (file: FileInfo) => void;
  activeFile: FileInfo | null;
}

export function Sidebar({ onFileSelect, activeFile }: SidebarProps) {
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  const openWorkspace = async () => {
    const dir = await fs.openDirectory();
    if (dir) {
      setWorkspace(dir);
      loadFiles(dir);
    }
  };

  const loadFiles = async (dir: string) => {
    const mdFiles = await fs.readDirectory(dir);
    setFiles(mdFiles);
  };

  // Reload files if workspace changes (simplified polling or just static for now)
  useEffect(() => {
    if (workspace) {
      loadFiles(workspace);
    }
  }, [workspace, activeFile]);

  return (
    <div className={`sidebar flex flex-col border-r border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 transition-all duration-300 ${isOpen ? 'w-64' : 'w-12'}`}>
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-neutral-800">
        {isOpen && <span className="font-semibold text-sm text-gray-500 dark:text-gray-400">EXPLORER</span>}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-neutral-800 text-gray-500 dark:text-gray-400"
        >
          {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {isOpen && (
        <div className="flex-1 overflow-y-auto p-2">
          {!workspace ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm space-y-4">
              <FolderOpen size={48} className="opacity-50" />
              <button
                onClick={openWorkspace}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Open Folder
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-400 uppercase mb-2 px-2 truncate" title={workspace}>
                {workspace.split(/[/\\]/).pop()}
              </div>
              {files.map(file => (
                <button
                  key={file.path}
                  onClick={() => onFileSelect(file)}
                  className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${
                    activeFile?.path === file.path
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-200 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <FileText size={16} />
                  <span className="truncate">{file.name}</span>
                </button>
              ))}
              {files.length === 0 && (
                <div className="text-xs text-gray-400 px-2 italic">No markdown files</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}