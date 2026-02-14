import { useState, useCallback, useRef } from 'react';
import { AnalysisResponse } from '@/types/verification';

interface EnvironmentIssue {
  type: 'lighting' | 'blur' | 'positioning' | 'multiple_faces';
  message: string;
  severity: 'warning' | 'error';
  consecutiveFrames: number;
}

const ISSUE_THRESHOLD = 5; // Show persistent message after N consecutive failures

export function usePoorEnvironmentDetection() {
  const [currentIssues, setCurrentIssues] = useState<EnvironmentIssue[]>([]);
  const issueCounters = useRef<Map<string, number>>(new Map());

  function incrementIssueCounter(issueKey: string) {
    const current = issueCounters.current.get(issueKey) || 0;
    issueCounters.current.set(issueKey, current + 1);
  }

  function resetIssueCounter(issueKey: string) {
    issueCounters.current.set(issueKey, 0);
  }

  function getIssueCount(issueKey: string): number {
    return issueCounters.current.get(issueKey) || 0;
  }

  const checkEnvironment = useCallback((analysisResponse: AnalysisResponse) => {
    const checks = analysisResponse.checks;
    const newIssues: EnvironmentIssue[] = [];

    if (!checks.image_quality.passed && checks.image_quality.brightness < 40) {
      incrementIssueCounter('lighting_dark');
      if (getIssueCount('lighting_dark') >= ISSUE_THRESHOLD) {
        newIssues.push({
          type: 'lighting',
          message: 'Lighting is too dark. Move to a brighter area.',
          severity: 'error',
          consecutiveFrames: getIssueCount('lighting_dark'),
        });
      }
    } else {
      resetIssueCounter('lighting_dark');
    }

    if (!checks.image_quality.passed && checks.image_quality.blur > 100) {
      incrementIssueCounter('blur');
      if (getIssueCount('blur') >= ISSUE_THRESHOLD) {
        newIssues.push({
          type: 'blur',
          message: 'Image is blurry. Hold steady.',
          severity: 'warning',
          consecutiveFrames: getIssueCount('blur'),
        });
      }
    } else {
      resetIssueCounter('blur');
    }

    if (!checks.positioning.passed) {
      incrementIssueCounter('positioning');
      if (getIssueCount('positioning') >= ISSUE_THRESHOLD) {
        newIssues.push({
          type: 'positioning',
          message: 'Center your face in the frame.',
          severity: 'warning',
          consecutiveFrames: getIssueCount('positioning'),
        });
      }
    } else {
      resetIssueCounter('positioning');
    }

    setCurrentIssues(newIssues);
  }, []);

  const clearIssues = useCallback(() => {
    setCurrentIssues([]);
    issueCounters.current.clear();
  }, []);

  return {
    currentIssues,
    checkEnvironment,
    clearIssues,
  };
}
