"""
Vision Agent — Section 5.3

Analyzes an uploaded photo for the civic issue shown. EXIF geolocation
extraction (separate from the Gemini call) happens here too, since both
are "things we do to a photo before it enters the pipeline."
"""
from __future__ import annotations

import io

from integrations.llm_client import generate_json

SYSTEM_PROMPT = """You are analyzing a citizen-uploaded photo for a civic infrastructure
reporting platform. Identify the primary issue visible, rate its severity,
and flag if the image appears unrelated to an infrastructure/civic issue
(e.g. a selfie, unrelated object).

Return strict JSON:
{
  "detected_issue": "pothole | broken_bridge | garbage | waterlogging | school_damage | hospital_condition | electricity_issue | other | unrelated",
  "severity": "low | medium | high | critical",
  "confidence": 0.0-1.0,
  "description": "one sentence, factual, no speculation"
}"""


def analyze_image(image_ref: str) -> dict:
    """
    `image_ref` is a URL or storage path to the uploaded photo. Actual
    multimodal Gemini calls need image bytes attached as an inline_data
    part rather than plain text — this wrapper is intentionally simple
    (passes the reference) and the mock path in llm_client covers the
    no-provider-configured case. Swap in real multimodal payload
    construction (Gemini's inline_data image part) when wiring to a live
    bucket — Mistral/HuggingFace fallback paths are text-only for now, so
    a real image analysis call should pin to Gemini specifically.
    """
    user_content = f"Image reference: {image_ref}"
    return generate_json(SYSTEM_PROMPT, user_content)


def extract_exif_geolocation(image_bytes: bytes) -> dict | None:
    """
    Extracts GPS lat/lng from image EXIF data, if present. Returns None
    if the image has no GPS EXIF tags (common — many phones strip this,
    or the citizen uploaded a screenshot). Falls back to manual location
    entry in the UI when this returns None.
    """
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS, GPSTAGS
    except ImportError:
        return None

    try:
        img = Image.open(io.BytesIO(image_bytes))
        exif_data = img._getexif()  # noqa: SLF001
        if not exif_data:
            return None

        gps_info = {}
        for tag_id, value in exif_data.items():
            tag = TAGS.get(tag_id, tag_id)
            if tag == "GPSInfo":
                for gps_tag_id, gps_value in value.items():
                    gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                    gps_info[gps_tag] = gps_value

        if not gps_info:
            return None

        def to_degrees(dms, ref):
            deg = dms[0] + dms[1] / 60.0 + dms[2] / 3600.0
            return -deg if ref in ("S", "W") else deg

        lat = to_degrees(gps_info["GPSLatitude"], gps_info.get("GPSLatitudeRef", "N"))
        lng = to_degrees(gps_info["GPSLongitude"], gps_info.get("GPSLongitudeRef", "E"))
        return {"lat": lat, "lng": lng}
    except Exception:  # noqa: BLE001
        return None
