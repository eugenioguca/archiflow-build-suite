import { useState, useCallback } from 'react';

interface UseMobileSidebarReturn {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

export function useMobileSidebar(): UseMobileSidebarReturn {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    toggle,
    open,
    close,
  };
}