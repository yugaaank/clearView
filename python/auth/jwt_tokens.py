"""
JWT token generation and validation for verified liveness proofs.

Tokens are cryptographically signed and include:
- Wallet address
- Verification timestamp
- Challenge type completed
- Proof hash (hash of validation frames)
- Expiration time
"""

import os
import jwt
import hashlib
import time
from datetime import datetime, timedelta
from typing import Dict, Optional
import secrets

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))  # Generate secure key
ALGORITHM = "HS256"
TOKEN_EXPIRY_HOURS = 24  # Tokens valid for 24 hours


class VerificationTokenManager:
    """Manages creation and validation of verification tokens"""

    def __init__(self, secret_key: str = SECRET_KEY):
        self.secret_key = secret_key
        self.algorithm = ALGORITHM

    def generate_proof_hash(self, frames: list, nonce: str, wallet_address: str) -> str:
        """
        Generate cryptographic hash of verification data.

        Args:
            frames: List of frame data (base64 or bytes)
            nonce: Unique challenge nonce
            wallet_address: User's wallet address

        Returns:
            str: Hexadecimal hash string
        """
        hasher = hashlib.sha256()

        # Add frames to hash
        for frame in frames:
            if isinstance(frame, str):
                hasher.update(frame.encode())
            else:
                hasher.update(frame)

        # Add nonce and wallet
        hasher.update(nonce.encode())
        hasher.update(wallet_address.lower().encode())

        return hasher.hexdigest()

    def create_verification_token(
        self,
        wallet_address: str,
        challenge_type: str,
        proof_hash: str,
        session_id: str,
        additional_claims: Optional[Dict] = None
    ) -> str:
        """
        Create a signed JWT verification token.

        Args:
            wallet_address: User's wallet address
            challenge_type: Type of challenge completed (blink, smile, etc)
            proof_hash: Cryptographic hash of verification data
            session_id: Unique session identifier
            additional_claims: Optional additional claims to include

        Returns:
            str: Signed JWT token
        """
        now = datetime.utcnow()
        expires_at = now + timedelta(hours=TOKEN_EXPIRY_HOURS)

        payload = {
            # Standard JWT claims
            "iss": "vault-liveness-detector",  # Issuer
            "sub": wallet_address.lower(),      # Subject (wallet address)
            "iat": int(now.timestamp()),        # Issued at
            "exp": int(expires_at.timestamp()), # Expiration
            "jti": session_id,                  # JWT ID (session ID)

            # Custom claims
            "challenge_type": challenge_type,
            "proof_hash": proof_hash,
            "verified_at": now.isoformat(),
            "verification_type": "proof_of_life",
        }

        # Add any additional claims
        if additional_claims:
            payload.update(additional_claims)

        # Sign and return token
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return token

    def validate_token(self, token: str) -> Dict:
        """
        Validate and decode a verification token.

        Args:
            token: JWT token string

        Returns:
            dict: Decoded token payload

        Raises:
            jwt.ExpiredSignatureError: Token has expired
            jwt.InvalidTokenError: Token is invalid
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "require": ["sub", "proof_hash", "challenge_type"]
                }
            )
            return payload

        except jwt.ExpiredSignatureError:
            raise ValueError("Verification token has expired")
        except jwt.InvalidTokenError as e:
            raise ValueError(f"Invalid verification token: {str(e)}")

    def verify_for_minting(self, token: str, wallet_address: str) -> bool:
        """
        Verify token is valid for minting a proof-of-life NFT.

        Args:
            token: JWT verification token
            wallet_address: Wallet address requesting to mint

        Returns:
            bool: True if token is valid and matches wallet
        """
        try:
            payload = self.validate_token(token)

            # Verify wallet address matches
            if payload["sub"].lower() != wallet_address.lower():
                return False

            # Verify it's a proof_of_life verification
            if payload.get("verification_type") != "proof_of_life":
                return False

            # Additional checks can go here
            # e.g., check if token has been used for minting before

            return True

        except ValueError:
            return False


# Singleton instance
_token_manager = None


def get_token_manager() -> VerificationTokenManager:
    """Get or create token manager singleton"""
    global _token_manager
    if _token_manager is None:
        _token_manager = VerificationTokenManager()
    return _token_manager
