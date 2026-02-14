"""
Analytics event tracking for verification flow.
Logs to stdout; can be swapped to real pipeline later.
"""

import logging
from datetime import datetime
from typing import Dict, Optional
from enum import Enum
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """Verification event types"""
    # Session events
    VERIFICATION_STARTED = "verification_started"
    CHALLENGE_GENERATED = "challenge_generated"
    SESSION_TIMEOUT = "session_timeout"
    
    # Quality gate events
    QUALITY_GATE_FAILED = "quality_gate_failed"
    LIVENESS_FAILED = "liveness_failed"
    POSITIONING_FAILED = "positioning_failed"
    IMAGE_QUALITY_FAILED = "image_quality_failed"
    
    # Validation events
    GESTURE_CAPTURED = "gesture_captured"
    VALIDATION_SUCCESS = "validation_success"
    VALIDATION_FAILED = "validation_failed"
    
    # Error events
    ATTEMPTS_EXHAUSTED = "attempts_exhausted"
    CAMERA_PERMISSION_DENIED = "camera_permission_denied"
    NETWORK_ERROR = "network_error"
    
    # Security events
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    REPLAY_ATTACK_DETECTED = "replay_attack_detected"
    MULTIPLE_FACES_DETECTED = "multiple_faces_detected"


class AnalyticsTracker:
    """Track and log analytics events"""
    
    def __init__(self):
        self.logger = logger
    
    def track_event(
        self,
        event_type: EventType,
        session_id: str,
        wallet_address: Optional[str] = None,
        metadata: Optional[Dict] = None
    ):
        event_data = {
            "event": event_type.value,
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat(),
            "wallet_address": wallet_address[:10] + "..." if wallet_address else None,
        }
        
        if metadata:
            event_data["metadata"] = metadata
        
        self.logger.info(f"Analytics Event: {json.dumps(event_data)}")
    
    def track_quality_failure(
        self,
        session_id: str,
        check_name: str,
        check_score: float,
        threshold: float,
        wallet_address: Optional[str] = None
    ):
        self.track_event(
            EventType.QUALITY_GATE_FAILED,
            session_id,
            wallet_address,
            metadata={
                "check": check_name,
                "score": check_score,
                "threshold": threshold,
                "delta": threshold - check_score
            }
        )
    
    def track_validation_result(
        self,
        session_id: str,
        success: bool,
        challenge_type: str,
        liveness_confidence: float,
        gesture_confidence: float,
        wallet_address: Optional[str] = None,
        failure_reason: Optional[str] = None
    ):
        event_type = EventType.VALIDATION_SUCCESS if success else EventType.VALIDATION_FAILED
        
        self.track_event(
            event_type,
            session_id,
            wallet_address,
            metadata={
                "challenge_type": challenge_type,
                "liveness_confidence": liveness_confidence,
                "gesture_confidence": gesture_confidence,
                "failure_reason": failure_reason if not success else None
            }
        )


_analytics_tracker = None

def get_analytics_tracker() -> AnalyticsTracker:
    global _analytics_tracker
    if _analytics_tracker is None:
        _analytics_tracker = AnalyticsTracker()
    return _analytics_tracker
