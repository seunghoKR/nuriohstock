import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from loguru import logger

class AESCipher:
    """AES-256-GCM 암복호화 유틸리티"""

    def __init__(self, master_key: str = None):
        self.master_key = master_key or os.getenv("MASTER_KEY")
        if not self.master_key:
            raise ValueError("MASTER_KEY is not set.")
        try:
            # 32 bytes = 64 hex characters expected
            self.key = bytes.fromhex(self.master_key)
            if len(self.key) != 32:
                raise ValueError("Key must be 32 bytes (64 hex characters)")
            self.aesgcm = AESGCM(self.key)
        except Exception as e:
            logger.error(f"Failed to initialize AESCipher: {e}")
            raise

    def encrypt(self, plaintext: str) -> str:
        """평문을 암호화하여 base64 문자열로 반환"""
        try:
            nonce = os.urandom(12)  # GCM recommended nonce size is 12 bytes
            ciphertext = self.aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)
            encrypted_data = nonce + ciphertext
            return base64.b64encode(encrypted_data).decode('utf-8')
        except Exception as e:
            logger.error(f"Encryption error: {e}")
            raise

    def decrypt(self, ciphertext: str) -> str:
        """base64 암호문을 복호화하여 평문 반환"""
        try:
            encrypted_data = base64.b64decode(ciphertext.encode('utf-8'))
            nonce = encrypted_data[:12]
            actual_ciphertext = encrypted_data[12:]
            plaintext = self.aesgcm.decrypt(nonce, actual_ciphertext, None)
            return plaintext.decode('utf-8')
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            raise
