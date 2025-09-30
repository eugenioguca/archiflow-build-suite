/**
 * Dev-only button to manually unfreeze UI when debugging
 */
import { unfreezeUI } from '../../utils/unfreeze';

export function UnfreezeButton() {
  // Only show in development
  if (import.meta.env.PROD) return null;

  return (
    <button
      type="button"
      onClick={() => unfreezeUI('dev-button')}
      className="fixed bottom-4 right-4 z-[2000] bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg shadow-lg font-medium text-sm transition-colors"
      title="Desbloquear UI (solo desarrollo)"
    >
      🔓 Desbloquear UI
    </button>
  );
}
