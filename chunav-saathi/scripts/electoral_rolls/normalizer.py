"""Normalization helpers that preserve the source representation."""

from __future__ import annotations

import re


_KANNADA_DIGITS = str.maketrans("೦೧೨೩೪೫೬೭೮೯", "0123456789")
_GENDER_VALUES = {
    "male": "male",
    "m": "male",
    "ಪುರುಷ": "male",
    "female": "female",
    "f": "female",
    "ಮಹಿಳೆ": "female",
    "third gender": "third_gender",
    "other": "third_gender",
    "ತೃತೀಯ ಲಿಂಗ": "third_gender",
}


def normalize_digits(value: str) -> str:
    return value.translate(_KANNADA_DIGITS)


def parse_integer(value: str | None) -> int | None:
    if value is None:
        return None
    match = re.search(r"\d+", normalize_digits(value))
    return int(match.group()) if match else None


def normalize_gender(value: str | None) -> str | None:
    if value is None:
        return None
    return _GENDER_VALUES.get(value.strip().casefold())


def field_state(label_seen: bool, value: str | None, confidence: float | None) -> str:
    if not label_seen:
        return "not_present"
    if not value or not value.strip():
        return "blank"
    if confidence is not None and confidence < 35:
        return "unreadable"
    if confidence is not None and confidence < 75:
        return "low_confidence"
    return "extracted"


def clean_value(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = re.sub(r"\s+", " ", value).strip(" \t:：-;,.|")
    return cleaned or None