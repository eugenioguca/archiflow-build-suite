/**
 * Hook to disable tooltips globally when a component is open
 * Prevents tooltip interference with popovers/comboboxes
 */
import { useEffect } from 'react';

export function useDisableTooltipsWhenOpen(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      document.body.setAttribute('data-tooltips-disabled', 'true');
    } else {
      document.body.removeAttribute('data-tooltips-disabled');
    }

    // Cleanup on unmount
    return () => {
      document.body.removeAttribute('data-tooltips-disabled');
    };
  }, [isOpen]);
}
