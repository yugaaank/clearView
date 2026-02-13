'use client';

import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { VerificationProgress, CheckStatus } from '@/types/verification';

interface ProgressTrackerProps {
  progress: VerificationProgress;
}

export default function ProgressTracker({ progress }: ProgressTrackerProps) {
  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-4 backdrop-blur-xl">
      {/* Overall Progress */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-white/80">Verification Progress</h3>
          <span className="text-xl font-bold text-neon-blue">
            {progress.qualityScore}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getScoreColor(progress.qualityScore)}`}
            style={{ width: `${progress.qualityScore}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        <h4 className="font-medium text-white/70 text-xs">Quality Checks</h4>
        
        {progress.checks.map((check, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-white/5 rounded"
          >
            <div className="flex items-center gap-2">
              {getStatusIcon(check.status)}
              <span className="text-sm text-white/80">{check.name}</span>
            </div>
            {check.score !== undefined && (
              <span className="text-xs text-white/60 font-mono">
                {(check.score * 100).toFixed(0)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Hints */}
      {progress.hints.length > 0 && (
        <div className="bg-yellow-50/10 border border-yellow-200/30 rounded p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              {progress.hints.map((hint, index) => (
                <p key={index} className="text-xs text-yellow-100">
                  {hint}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Timer and Attempts */}
      <div className="flex justify-between text-xs text-white/60 pt-2 border-t border-white/10">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>Time: {progress.timeRemaining}s</span>
        </div>
        <span>Attempt {progress.attemptNumber} of 10</span>
      </div>

      {/* Ready Indicator */}
      {progress.readyForValidation && (
        <div className="bg-green-500/10 border border-green-500/40 rounded p-3 text-center">
          <p className="text-green-300 font-medium text-sm">
            ✓ Ready for gesture validation!
          </p>
        </div>
      )}
    </div>
  );
}
