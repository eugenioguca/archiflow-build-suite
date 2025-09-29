/**
 * Planning v2 Feature Flag
 * Set to true to enable the new Planning v2 module
 */
export const PLANNING_V2_ENABLED = true;

export const isPlanningV2Enabled = (): boolean => {
  return PLANNING_V2_ENABLED;
};
