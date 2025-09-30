/**
 * Keyboard shortcuts for catalog grid
 */
import { useEffect } from 'react';

export interface KeyboardShortcutsConfig {
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onSearch?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onOpenColumns?: () => void;
  onOpenTemplates?: () => void;
  onNewPartida?: () => void;
  onNewSubpartida?: () => void;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + D: Duplicate
      if (cmdOrCtrl && e.key === 'd') {
        e.preventDefault();
        config.onDuplicate?.();
      }

      // Alt + Arrow Up: Move up
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        config.onMoveUp?.();
      }

      // Alt + Arrow Down: Move down
      if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        config.onMoveDown?.();
      }

      // Ctrl/Cmd + K: Search
      if (cmdOrCtrl && e.key === 'k') {
        e.preventDefault();
        config.onSearch?.();
      }

      // Ctrl/Cmd + S: Save
      if (cmdOrCtrl && e.key === 's') {
        e.preventDefault();
        config.onSave?.();
      }

      // Delete: Remove
      if (e.key === 'Delete' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        config.onDelete?.();
      }

      // Ctrl/Cmd + A: Select all
      if (cmdOrCtrl && e.key === 'a') {
        e.preventDefault();
        config.onSelectAll?.();
      }

      // C: Open columns (when no input focused)
      if (e.key === 'c' && !cmdOrCtrl && !e.altKey && !isInputFocused()) {
        e.preventDefault();
        config.onOpenColumns?.();
      }

      // T: Open templates (when no input focused)
      if (e.key === 't' && !cmdOrCtrl && !e.altKey && !isInputFocused()) {
        e.preventDefault();
        config.onOpenTemplates?.();
      }

      // N: Nueva Partida (when no input focused)
      if (e.key === 'n' && !cmdOrCtrl && !e.altKey && !isInputFocused()) {
        e.preventDefault();
        config.onNewPartida?.();
      }

      // S: Agregar Subpartida (when no input focused)
      if (e.key === 's' && !cmdOrCtrl && !e.altKey && !isInputFocused()) {
        e.preventDefault();
        config.onNewSubpartida?.();
      }

      // D: Duplicate selected (when no input focused)
      if (e.key === 'd' && !cmdOrCtrl && !e.altKey && !isInputFocused()) {
        e.preventDefault();
        config.onDuplicate?.();
      }
    };

    const isInputFocused = () => {
      const activeElement = document.activeElement;
      return activeElement?.tagName === 'INPUT' || 
             activeElement?.tagName === 'TEXTAREA' ||
             activeElement?.hasAttribute('contenteditable');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config]);
}
