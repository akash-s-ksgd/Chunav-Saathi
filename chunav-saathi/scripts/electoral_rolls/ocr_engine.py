"""Local Tesseract OCR and image-geometry helpers."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import pymupdf
import pytesseract
from pytesseract import Output


def configure_tesseract() -> list[str]:
    command = os.getenv("TESSERACT_CMD")
    if not command:
        candidate = Path.home() / "AppData/Local/Programs/Tesseract-OCR/tesseract.exe"
        if candidate.is_file():
            command = str(candidate)
    if command:
        pytesseract.pytesseract.tesseract_cmd = command
    version = pytesseract.get_tesseract_version()
    languages = pytesseract.get_languages(config="")
    required = {"kan", "eng"}
    missing = sorted(required - set(languages))
    if missing:
        raise RuntimeError("Tesseract is installed but missing language models: " + ", ".join(missing))
    return [str(version), *sorted(required)]


def render_page(document: pymupdf.Document, page_index: int, dpi: int = 300) -> np.ndarray:
    scale = dpi / 72
    pixmap = document[page_index].get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
    encoded = np.frombuffer(pixmap.tobytes("png"), dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode rendered PDF page")
    return image


def detect_grid_boxes(image: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Detect card-like grid cells using line geometry scaled to the page."""
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 12
    )
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(12, width // 28), 1))
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(12, height // 28)))
    horizontal = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel)
    vertical = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel)
    grid = cv2.add(horizontal, vertical)
    grid = cv2.morphologyEx(
        grid,
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_RECT, (max(3, width // 240), max(3, height // 240))),
    )
    contours, _ = cv2.findContours(grid, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    candidates = []
    for contour in contours:
        x, y, box_width, box_height = cv2.boundingRect(contour)
        area_ratio = box_width * box_height / (width * height)
        if (
            box_width >= width * 0.10
            and box_height >= height * 0.025
            and area_ratio >= 0.003
            and area_ratio <= 0.35
        ):
            candidates.append((x, y, box_width, box_height))

    candidates.sort(key=lambda rect: (rect[1], rect[0], -rect[2] * rect[3]))
    selected: list[tuple[int, int, int, int]] = []
    for candidate in candidates:
        x, y, box_width, box_height = candidate
        contained = any(
            sx <= x and sy <= y and sx + sw >= x + box_width and sy + sh >= y + box_height
            for sx, sy, sw, sh in selected
        )
        duplicate = any(
            abs(sx - x) < width * 0.01
            and abs(sy - y) < height * 0.01
            and abs(sw - box_width) < width * 0.02
            and abs(sh - box_height) < height * 0.02
            for sx, sy, sw, sh in selected
        )
        if not contained and not duplicate:
            selected.append(candidate)
    return selected


def ocr_image(
    image: np.ndarray,
    language: str = "kan+eng",
    *,
    remove_table_lines: bool = False,
) -> dict[str, Any]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    if remove_table_lines:
        binary = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)[1]
        inverted = 255 - binary
        horizontal_kernel = cv2.getStructuringElement(
            cv2.MORPH_RECT, (max(20, image.shape[1] // 25), 1)
        )
        vertical_kernel = cv2.getStructuringElement(
            cv2.MORPH_RECT, (1, max(20, image.shape[0] // 12))
        )
        horizontal = cv2.morphologyEx(inverted, cv2.MORPH_OPEN, horizontal_kernel)
        vertical = cv2.morphologyEx(inverted, cv2.MORPH_OPEN, vertical_kernel)
        prepared = 255 - cv2.subtract(inverted, cv2.add(horizontal, vertical))
    else:
        prepared = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 9
        )
    data = pytesseract.image_to_data(
        prepared,
        lang=language,
        config="--psm 6",
        output_type=Output.DICT,
    )
    words = []
    confidences = []
    lines: dict[tuple[int, int, int], list[str]] = {}
    for index, value in enumerate(data["text"]):
        text = value.strip()
        if not text:
            continue
        try:
            confidence = float(data["conf"][index])
        except (TypeError, ValueError):
            confidence = -1
        words.append({
            "text": text,
            "confidence": confidence if confidence >= 0 else None,
            "left": int(data["left"][index]),
            "top": int(data["top"][index]),
            "width": int(data["width"][index]),
            "height": int(data["height"][index]),
            "block_num": int(data["block_num"][index]),
            "paragraph_num": int(data["par_num"][index]),
            "line_num": int(data["line_num"][index]),
        })
        line_key = (
            int(data["block_num"][index]),
            int(data["par_num"][index]),
            int(data["line_num"][index]),
        )
        lines.setdefault(line_key, []).append(text)
        if confidence >= 0:
            confidences.append(confidence)
    return {
        "text": "\n".join(" ".join(parts) for parts in lines.values()),
        "words": words,
        "confidence": round(float(np.mean(confidences)), 2) if confidences else None,
    }