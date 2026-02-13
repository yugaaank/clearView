/**
 * Lightweight frontend analytics shim.
 * Currently logs to console; can be wired to backend or third-party later.
 */

type EventName =
  | 'verification_started'
  | 'challenge_displayed'
  | 'quality_gate_failed'
  | 'gesture_captured'
  | 'validation_success'
  | 'validation_failed'
  | 'session_timeout'
  | 'camera_permission_denied'
  | 'attempts_exhausted'
  | 'network_error'
  | 'camera_permission_granted';

interface EventProperties {
  [key: string]: string | number | boolean | undefined | null;
}

class Analytics {
  private sessionId: string | null = null;

  startSession(sessionId: string) {
    this.sessionId = sessionId;
  }

  track(eventName: EventName, properties?: EventProperties) {
    const event = {
      event: eventName,
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      ...properties,
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Analytics]', event);
    }
  }
}

export const analytics = new Analytics();
