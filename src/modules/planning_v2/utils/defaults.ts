/**
 * Utilities for calculating effective default values
 * Implements COALESCE logic: Concepto override > Partida override > Budget default
 */

export interface EffectiveDefaultsContext {
  concepto: {
    honorarios_pct?: number | null;
    desperdicio_pct?: number | null;
  };
  budgetSettings?: {
    honorarios_pct_default?: number;
    desperdicio_pct_default?: number;
    defaults?: {
      honorarios_pct?: number;
      desperdicio_pct?: number;
      iva_pct?: number;
    };
  };
  partidaOverride?: {
    honorarios_pct_override?: number | null;
    desperdicio_pct_override?: number | null;
  };
}

/**
 * Get effective honorarios percentage
 * Priority: Concepto value > Partida override > Budget default (new or old structure) > 0.17
 */
export function getEffectiveHonorarios(context: EffectiveDefaultsContext): {
  value: number;
  isDefault: boolean;
  source: 'concepto' | 'partida' | 'budget' | 'system';
} {
  const { concepto, budgetSettings, partidaOverride } = context;
  
  // Check concepto value
  if (concepto.honorarios_pct !== null && concepto.honorarios_pct !== undefined) {
    return { value: concepto.honorarios_pct, isDefault: false, source: 'concepto' };
  }
  
  // Check partida override
  if (partidaOverride?.honorarios_pct_override !== null && partidaOverride?.honorarios_pct_override !== undefined) {
    return { value: partidaOverride.honorarios_pct_override, isDefault: true, source: 'partida' };
  }
  
  // Check budget default (new structure or old structure)
  if (budgetSettings) {
    const budgetDefault = budgetSettings.defaults?.honorarios_pct ?? budgetSettings.honorarios_pct_default;
    if (budgetDefault !== undefined) {
      return { value: budgetDefault, isDefault: true, source: 'budget' };
    }
  }
  
  // System default
  return { value: 0.17, isDefault: true, source: 'system' };
}

/**
 * Get effective desperdicio percentage
 * Priority: Concepto value > Partida override > Budget default (new or old structure) > 0.05
 */
export function getEffectiveDesperdicio(context: EffectiveDefaultsContext): {
  value: number;
  isDefault: boolean;
  source: 'concepto' | 'partida' | 'budget' | 'system';
} {
  const { concepto, budgetSettings, partidaOverride } = context;
  
  // Check concepto value
  if (concepto.desperdicio_pct !== null && concepto.desperdicio_pct !== undefined) {
    return { value: concepto.desperdicio_pct, isDefault: false, source: 'concepto' };
  }
  
  // Check partida override
  if (partidaOverride?.desperdicio_pct_override !== null && partidaOverride?.desperdicio_pct_override !== undefined) {
    return { value: partidaOverride.desperdicio_pct_override, isDefault: true, source: 'partida' };
  }
  
  // Check budget default (new structure or old structure)
  if (budgetSettings) {
    const budgetDefault = budgetSettings.defaults?.desperdicio_pct ?? budgetSettings.desperdicio_pct_default;
    if (budgetDefault !== undefined) {
      return { value: budgetDefault, isDefault: true, source: 'budget' };
    }
  }
  
  // System default
  return { value: 0.05, isDefault: true, source: 'system' };
}

/**
 * Get source label for tooltip
 */
export function getDefaultSourceLabel(source: 'concepto' | 'partida' | 'budget' | 'system'): string {
  switch (source) {
    case 'concepto':
      return 'Valor específico del concepto';
    case 'partida':
      return 'Override de la partida';
    case 'budget':
      return 'Default del presupuesto';
    case 'system':
      return 'Default del sistema';
  }
}
