export type EventType = 'onFileOpen' | 'onBeforeSave' | 'onEditorChange';

export interface MenuItem {
  label: string;
  onClick: () => void;
}

export interface ModalState {
  isOpen: boolean;
  title: string;
  content: string; // HTML string
}

export interface EditorAPI {
  // UI capabilities
  addMenuItem: (menuName: string, label: string, onClick: () => void) => void;
  showModal: (title: string, htmlContent: string) => void;
  closeModal: () => void;

  // Event system
  on: (event: EventType, callback: (...args: any[]) => void) => void;
  off: (event: EventType, callback: (...args: any[]) => void) => void;

  // Methods for plugins to read state (App will inject these)
  getActiveFilePath: () => string | null;
  getEditorContent: () => string;
}

export interface EditorPlugin {
  name: string;
  version: string;
  activate: (api: EditorAPI) => void;
  deactivate?: () => void;
}

class EditorCoreAPI implements EditorAPI {
  private menus: Record<string, MenuItem[]> = {};
  private listeners: Record<string, Array<(...args: any[]) => void>> = {};
  private modalState: ModalState = { isOpen: false, title: '', content: '' };

  private onMenusChangedCallback: ((menus: Record<string, MenuItem[]>) => void) | null = null;
  private onModalChangedCallback: ((modal: ModalState) => void) | null = null;

  // State accessors provided by the App
  private activeFilePathProvider: () => string | null = () => null;
  private editorContentProvider: () => string = () => '';

  // UI
  addMenuItem(menuName: string, label: string, onClick: () => void) {
    if (!this.menus[menuName]) {
      this.menus[menuName] = [];
    }
    this.menus[menuName].push({ label, onClick });
    this.notifyMenusChanged();
  }

  getMenus() {
    return this.menus;
  }

  showModal(title: string, htmlContent: string) {
    this.modalState = { isOpen: true, title, content: htmlContent };
    this.notifyModalChanged();
  }

  closeModal() {
    this.modalState = { ...this.modalState, isOpen: false };
    this.notifyModalChanged();
  }

  // Events
  on(event: EventType, callback: (...args: any[]) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event: EventType, callback: (...args: any[]) => void) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: EventType, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try {
          cb(...args);
        } catch (err) {
          console.error(`Error in plugin listener for ${event}:`, err);
        }
      });
    }
  }

  // State
  getActiveFilePath() {
    return this.activeFilePathProvider();
  }

  getEditorContent() {
    return this.editorContentProvider();
  }

  // Internal hooks for App
  _setMenuCallback(cb: (menus: Record<string, MenuItem[]>) => void) {
    this.onMenusChangedCallback = cb;
    cb(this.menus);
  }

  _setModalCallback(cb: (modal: ModalState) => void) {
    this.onModalChangedCallback = cb;
    cb(this.modalState);
  }

  _setStateProviders(
    filePathProvider: () => string | null,
    contentProvider: () => string
  ) {
    this.activeFilePathProvider = filePathProvider;
    this.editorContentProvider = contentProvider;
  }

  private notifyMenusChanged() {
    if (this.onMenusChangedCallback) {
      // Return a new object to trigger React re-renders
      this.onMenusChangedCallback({ ...this.menus });
    }
  }

  private notifyModalChanged() {
    if (this.onModalChangedCallback) {
      this.onModalChangedCallback({ ...this.modalState });
    }
  }
}

export const coreAPI = new EditorCoreAPI();

// Expose globally for standalone plugin scripts
declare global {
  interface Window {
    EditorAPI: EditorAPI;
  }
}
if (typeof window !== 'undefined') {
  window.EditorAPI = coreAPI;
}