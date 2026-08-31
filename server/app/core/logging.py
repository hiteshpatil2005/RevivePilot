import logging
import sys
import re
from typing import Any

SENSITIVE_KEYS = {
    "password", "password_hash", "token", "secret",
    "jwt_secret_key", "razorpay_key_secret", "gemini_api_key",
    "authorization", "api_key"
}


class SensitiveFilter(logging.Filter):
    """Filter that masks sensitive fields from log messages."""
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            # Mask bearer tokens
            record.msg = re.sub(
                r"(Bearer\s+)[A-Za-z0-9\-\._~\+\/]+=*",
                r"\1[MASKED_TOKEN]",
                record.msg,
                flags=re.IGNORECASE
            )
            # Mask password references in query params or text
            record.msg = re.sub(
                r"(password[\"']?\s*[:=]\s*[\"']?)[^\"',\s]+",
                r"\1[MASKED]",
                record.msg,
                flags=re.IGNORECASE
            )
        return True


def setup_logging(debug: bool = False) -> logging.Logger:
    logger = logging.getLogger("revivepilot")
    level = logging.DEBUG if debug else logging.INFO
    logger.setLevel(level)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        handler.addFilter(SensitiveFilter())
        logger.addHandler(handler)

    return logger


logger = setup_logging()
