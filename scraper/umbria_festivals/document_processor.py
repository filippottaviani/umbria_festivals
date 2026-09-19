"""
Document and image processing utilities for Umbria Festivals AI Agent.
Handles reading and preparing text/images from PNG, JPG, WEBP, and PDF files.
"""

import io
from typing import Union, Dict, Any
from PIL import Image

try:
    import pypdf
except ImportError:
    pypdf = None


def load_image(source: Union[str, bytes, io.BytesIO]) -> Image.Image:
    """Loads an image from filepath, raw bytes, or BytesIO buffer."""
    if isinstance(source, str):
        return Image.open(source)
    elif isinstance(source, bytes):
        return Image.open(io.BytesIO(source))
    elif isinstance(source, io.BytesIO):
        return Image.open(source)
    else:
        raise ValueError("Unsupported image source type")


def extract_pdf_content(source: Union[str, bytes]) -> Dict[str, Any]:
    """
    Extracts plain text and page information from a PDF document.
    Returns a dictionary with extracted text and page count.
    """
    if pypdf is None:
        raise ImportError("pypdf is required for PDF processing. Please install pypdf.")

    if isinstance(source, str):
        reader = pypdf.PdfReader(source)
    elif isinstance(source, bytes):
        reader = pypdf.PdfReader(io.BytesIO(source))
    else:
        raise ValueError("Unsupported PDF source type")

    extracted_pages = []
    full_text = []

    for idx, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        extracted_pages.append({"page_number": idx + 1, "text": text})
        if text.strip():
            full_text.append(f"--- Pagina {idx + 1} ---\n{text}")

    return {
        "page_count": len(reader.pages),
        "pages": extracted_pages,
        "full_text": "\n\n".join(full_text)
    }
