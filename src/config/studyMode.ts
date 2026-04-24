// ============================================================================
// Study Mode Configuration
// Controls whether the app runs in normal autonomous mode or pure WoZ mode.
// ============================================================================

export type StudyMode = 'normal' | 'pure_woz';

// Phase 1 default: pure WoZ for Android study work.
// This is intentionally a simple constant for now so we can iterate
// without adding environment/config plumbing yet.
export const STUDY_MODE: StudyMode = 'pure_woz';

export function isPureWozMode(): boolean {
  return STUDY_MODE === 'pure_woz';
}
