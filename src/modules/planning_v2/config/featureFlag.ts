/**
 * Planning v2 Feature Flags
 * Set to true to enable features
 */
export const PLANNING_V2_ENABLED = true;
export const PLANNING_V2_TU_READONLY = true;
export const PLANNING_V2_TU_CAPTURE = true;
export const PLANNING_V2_TEMPLATES = true; // Enable/disable template functionality

export const isPlanningV2Enabled = (): boolean => {
  return PLANNING_V2_ENABLED;
};

export const isTUIntegrationEnabled = (): boolean => {
  return PLANNING_V2_TU_READONLY;
};

export const isTemplatesEnabled = (): boolean => {
  return PLANNING_V2_TEMPLATES;
};
