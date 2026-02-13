"""
Test script for Phase 2 features
"""

import requests
from auth.jwt_tokens import get_token_manager

API_URL = "http://localhost:8000"
TEST_WALLET = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"


def test_challenge_generation():
    print("\n=== Testing Challenge Generation ===")
    response = requests.post(
        f"{API_URL}/api/challenge",
        json={"walletAddress": TEST_WALLET}
    )
    response.raise_for_status()
    data = response.json()
    print(f"Challenge: {data['challenge']['gesture']}")
    print(f"Instruction: {data['challenge']['instruction']}")
    print(f"Session ID: {data['sessionId']}")
    return data


def test_jwt_token_creation():
    print("\n=== Testing JWT Tokens ===")
    token_manager = get_token_manager()

    token = token_manager.create_verification_token(
        wallet_address=TEST_WALLET,
        challenge_type="smile",
        proof_hash="0x123abc...",
        session_id="test-session-123"
    )
    print(f"Generated Token: {token[:50]}...")

    payload = token_manager.validate_token(token)
    print(f"Token Subject (Wallet): {payload['sub']}")
    print(f"Challenge Type: {payload['challenge_type']}")
    print(f"Proof Hash: {payload['proof_hash']}")
    print(f"Verified At: {payload['verified_at']}")

    is_valid = token_manager.verify_for_minting(token, TEST_WALLET)
    print(f"Valid for Minting: {is_valid}")


def test_token_verification_endpoint():
    print("\n=== Testing Token Verification Endpoint ===")
    token_manager = get_token_manager()
    token = token_manager.create_verification_token(
        wallet_address=TEST_WALLET,
        challenge_type="blink",
        proof_hash="0xabc123...",
        session_id="test-session-456"
    )
    response = requests.post(
        f"{API_URL}/api/verify-token",
        json={
            "token": token,
            "walletAddress": TEST_WALLET
        }
    )
    response.raise_for_status()
    data = response.json()
    print(f"Valid: {data['valid']}")
    if data['valid']:
        print(f"Wallet: {data['wallet']}")
        print(f"Proof Hash: {data['proofHash']}")
        print(f"Challenge: {data['challengeType']}")


def test_analytics_logging():
    print("\n=== Testing Analytics ===")
    from analytics.events import get_analytics_tracker, EventType

    analytics = get_analytics_tracker()
    analytics.track_event(
        EventType.VERIFICATION_STARTED,
        session_id="test-123",
        wallet_address=TEST_WALLET
    )
    analytics.track_quality_failure(
        session_id="test-123",
        check_name="liveness",
        check_score=0.75,
        threshold=0.85,
        wallet_address=TEST_WALLET
    )
    analytics.track_validation_result(
        session_id="test-123",
        success=True,
        challenge_type="smile",
        liveness_confidence=0.92,
        gesture_confidence=0.88,
        wallet_address=TEST_WALLET
    )
    print("Analytics events logged successfully!")


if __name__ == "__main__":
    print("🧪 Phase 2 Feature Tests\n")
    try:
        test_jwt_token_creation()
        test_challenge_generation()
        test_token_verification_endpoint()
        test_analytics_logging()
        print("\n✅ All Phase 2 tests executed (check outputs above).")
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
