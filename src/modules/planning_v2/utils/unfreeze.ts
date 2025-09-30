/**
 * Utility to unfreeze UI after dialog operations
 * Removes overlays, inert attributes, scroll locks, and pointer-events blocks
 */

export function unfreezeUI(reason = 'manual') {
  try {
    // 1) Remove Radix overlays (if any)
    document.querySelectorAll(
      '[data-radix-alert-dialog-overlay], [data-radix-dialog-overlay], [data-radix-popover-overlay]'
    ).forEach(el => el.remove());

    // 2) Remove focus guards (rarely block, but clean anyway)
    document.querySelectorAll('[data-radix-focus-guard]').forEach(el => el.remove());

    // 3) Remove "inert" from app containers/ancestors - THIS IS THE KEY FIX
    document.querySelectorAll('[inert]').forEach(el => el.removeAttribute('inert'));

    // 4) Remove aria-hidden on root if stuck (doesn't block clicks, but keep clean)
    const root = document.getElementById('root') || document.body;
    root?.removeAttribute('aria-hidden');

    // 5) Reset pointer-events just in case
    (document.documentElement as HTMLElement).style.pointerEvents = '';
    document.body.style.pointerEvents = '';
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.style.pointerEvents = '';
    }

    // 6) Clear react-remove-scroll locks (body attributes)
    document.body.classList.remove('react-remove-scroll-body');
    document.body.removeAttribute('data-scroll-locked');
    // Reset common scroll lock styles
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.style.position = '';

    // 7) Remove any full-screen blockers accidentally left (transparent sheets)
    document.querySelectorAll<HTMLElement>('body > div')
      .forEach(el => {
        const s = getComputedStyle(el);
        if (
          s.position === 'fixed' &&
          s.pointerEvents !== 'none' &&
          s.inset === '0px' &&
          !el.getAttribute('role') && 
          !el.getAttribute('aria-modal') &&
          !el.id // Don't remove elements with IDs (likely important)
        ) {
          // Generic blocker without semantic info - remove it
          el.remove();
        }
      });

    // 8) Yield a frame to flush
    setTimeout(() => {}, 0);
    
    console.log('[PlanningV2] UI unfrozen:', reason);
  } catch (e) {
    console.warn('[PlanningV2] unfreeze failed', e);
  }
}
