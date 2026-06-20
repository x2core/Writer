import { useState, useEffect } from 'react';
import { plugins } from '@app/preload';

export function PluginManager() {
  const [pluginList, setPluginList] = useState<{name: string}[]>([]);

  const loadPlugins = async () => {
    const list = await plugins.list();
    setPluginList(list.map((p: any) => ({ name: p.name })));
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  const handleImport = async () => {
    const success = await plugins.importFile();
    if (success) loadPlugins();
  };

  const handleDelete = async (name: string) => {
    const success = await plugins.delete(name);
    if (success) loadPlugins();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-neutral-900 font-sans p-6 text-gray-800 dark:text-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Plugin Manager</h1>
        <button
          onClick={handleImport}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-sm transition-colors"
        >
          Import Plugin...
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 overflow-hidden flex-1">
        {pluginList.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            No plugins installed.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-neutral-700">
            {pluginList.map((p) => (
              <li key={p.name} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-neutral-750 transition-colors">
                <div className="flex flex-col">
                  <span className="font-medium text-lg">{p.name}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">Standalone JS Plugin</span>
                </div>
                <button
                  onClick={() => handleDelete(p.name)}
                  className="text-red-500 hover:text-red-700 px-3 py-1 border border-red-200 dark:border-red-900/50 rounded bg-red-50 dark:bg-red-900/10 transition-colors"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
        Note: Changes to plugins require restarting the main application window to take effect.
      </p>
    </div>
  );
}