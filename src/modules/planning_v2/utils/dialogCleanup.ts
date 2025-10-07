/**
 * Minimal cleanup utility for Radix dialogs/overlays
 * Only removes stuck overlays that can cause DOM inconsistencies
 */

export function cleanupStuckDialogs() {
  try {
    // Remove only truly stuck Radix overlays (data-state="closed" but still in DOM)
    const stuckOverlays = document.querySelectorAll(
      '[data-radix-alert-dialog-overlay][data-state="closed"], [data-radix-dialog-overlay][data-state="closed"]'
    );
    stuckOverlays.forEach(el => {
      console.log('[DialogCleanup] Removing stuck overlay:', el);
      el.remove();
    });

    // Remove inert attributes from body/root that might be stuck
    const bodyInert = document.body.hasAttribute('inert');
    const rootInert = document.getElementById('root')?.hasAttribute('inert');
    
    if (bodyInert) {
      console.log('[DialogCleanup] Removing inert from body');
      document.body.removeAttribute('inert');
    }
    
    if (rootInert) {
      console.log('[DialogCleanup] Removing inert from root');
      document.getElementById('root')?.removeAttribute('inert');
    }
  } catch (e) {
    console.warn('[DialogCleanup] Cleanup failed:', e);
  }
}
