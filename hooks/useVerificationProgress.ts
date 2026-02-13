import { useState, useCallback } from 'react';
import { VerificationProgress, AnalysisResponse, CheckStatus } from '@/types/verification';

export function useVerificationProgress() {
  const [progress, setProgress] = useState<VerificationProgress>({
    phase: 'init',
    qualityScore: 0,
    checksStatus: {
      liveness: 'pending',
      positioning: 'pending',
      imageQuality: 'pending',
      gestureReady: 'pending',
    },
    checks: [],
    attemptNumber: 1,
    attemptsRemaining: 2,
    timeRemaining: 60,
    readyForValidation: false,
    hints: [],
  });

  const updateFromAnalysis = useCallback((response: AnalysisResponse) => {
    const checks = response.checks;
    const scores = [
      checks.liveness.passed ? 100 : checks.liveness.confidence * 100,
      checks.face_detection.passed ? 100 : checks.face_detection.area_pct * 100,
      checks.positioning.passed ? 100 : 50,
      checks.image_quality.passed ? 100 : 50,
      checks.gesture_ready.passed ? 100 : 50,
    ];
    const qualityScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    const toStatus = (passed: boolean): CheckStatus => passed ? 'pass' : 'fail';

    setProgress(prev => ({
      ...prev,
      qualityScore,
      checksStatus: {
        liveness: toStatus(checks.liveness.passed),
        positioning: toStatus(checks.positioning.passed),
        imageQuality: toStatus(checks.image_quality.passed),
        gestureReady: toStatus(checks.gesture_ready.passed),
      },
      checks: [
        {
          name: 'Liveness Detection',
          status: toStatus(checks.liveness.passed),
          score: checks.liveness.confidence,
          message: checks.liveness.passed ? 'Real person detected' : 'Liveness check failed',
        },
        {
          name: 'Face Positioning',
          status: toStatus(checks.positioning.passed),
          message: checks.positioning.passed ? 'Face centered' : 'Center your face',
        },
        {
          name: 'Image Quality',
          status: toStatus(checks.image_quality.passed),
          score: checks.image_quality.brightness / 255,
          message: checks.image_quality.passed ? 'Good quality' : 'Improve image quality',
        },
        {
          name: 'Gesture Ready',
          status: toStatus(checks.gesture_ready.passed),
          message: checks.gesture_ready.passed ? 'Ready for gesture' : 'Get in position',
        },
      ],
      readyForValidation: response.ready_for_validation,
      hints: response.hints,
    }));
  }, []);

  const startAttempt = useCallback((attemptNumber: number) => {
    setProgress(prev => ({
      ...prev,
      phase: 'scanning',
      attemptNumber,
      attemptsRemaining: Math.max(0, 3 - attemptNumber),
      timeRemaining: 60,
    }));
  }, []);

  const decrementTime = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      timeRemaining: Math.max(0, prev.timeRemaining - 1),
    }));
  }, []);

  const setPhase = useCallback((phase: VerificationProgress['phase']) => {
    setProgress(prev => ({ ...prev, phase }));
  }, []);

  const reset = useCallback(() => {
    setProgress({
      phase: 'init',
      qualityScore: 0,
      checksStatus: {
        liveness: 'pending',
        positioning: 'pending',
        imageQuality: 'pending',
        gestureReady: 'pending',
      },
      checks: [],
      attemptNumber: 1,
      attemptsRemaining: 2,
      timeRemaining: 60,
      readyForValidation: false,
      hints: [],
    });
  }, []);

  return {
    progress,
    updateFromAnalysis,
    startAttempt,
    decrementTime,
    setPhase,
    reset,
  };
}
