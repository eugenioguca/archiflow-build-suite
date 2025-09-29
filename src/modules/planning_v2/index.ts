/**
 * Planning v2 Module Exports
 */

// Pages
export { default as PlanningV2Index } from './pages/PlanningV2Index';
export { default as BudgetDetail } from './pages/BudgetDetail';

// Feature flags
export { 
  PLANNING_V2_ENABLED, 
  PLANNING_V2_TU_READONLY,
  isPlanningV2Enabled,
  isTUIntegrationEnabled 
} from './config/featureFlag';

// Types
export * from './types';

// Services
export * from './services/budgetService';
export * from './services/snapshotService';
export * from './services/priceIntelligenceService';

// Adapters
export * from './adapters/projects';
export * from './adapters/clients';
export * from './adapters/tu';
export * from './adapters/tuActuals';

// Hooks
export { usePriceIntelligence } from './hooks/usePriceIntelligence';
