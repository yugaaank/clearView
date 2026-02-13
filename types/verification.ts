export type CheckStatus = 'pending' | 'pass' | 'fail';
export type VerificationPhase = 'init' | 'scanning' | 'validating' | 'success' | 'failed';

export interface QualityCheck {
  name: string;
  status: CheckStatus;
  score?: number;
  message?: string;
}

export interface VerificationProgress {
  phase: VerificationPhase;
  qualityScore: number;          // 0-100 aggregate score
  checksStatus: {
    liveness: CheckStatus;
    positioning: CheckStatus;
    imageQuality: CheckStatus;
    gestureReady: CheckStatus;
  };
  checks: QualityCheck[];         // Detailed check results
  attemptNumber: number;
  attemptsRemaining: number;
  timeRemaining: number;          // Seconds until timeout
  readyForValidation: boolean;
  hints: string[];
}

export interface AnalysisResponse {
  quality_passed: boolean;
  checks: {
    liveness: { passed: boolean; confidence: number; score: number };
    face_detection: { passed: boolean; bbox: number[]; area_pct: number };
    positioning: { passed: boolean; center_offset_x: number; center_offset_y: number };
    image_quality: { passed: boolean; brightness: number; blur: number; contrast: number };
    gesture_ready: { passed: boolean; baseline_set: boolean };
  };
  hints: string[];
  ready_for_validation: boolean;
}
