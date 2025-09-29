/**
 * Planning v2 Feature Flags
 * Set to true to enable features
 */
export const PLANNING_V2_ENABLED = true;
export const PLANNING_V2_TU_READONLY = true;

export const isPlanningV2Enabled = (): boolean => {
  return PLANNING_V2_ENABLED;
};

export const isTUIntegrationEnabled = (): boolean => {
  return PLANNING_V2_TU_READONLY;
};
