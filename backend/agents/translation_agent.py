"""Translation Agent — Section 5.2"""
from __future__ import annotations

from integrations.llm_client import generate_json

SYSTEM_PROMPT = """You are a translation normalizer for a civic issue reporting system.
Translate the following citizen submission into clear, formal English while
preserving all specific details (locations, numbers, dates, names of places).
Do not add information. Do not summarize. If any part is ambiguous or
inaudible, mark it with [unclear] rather than guessing.

Return strict JSON:
{
  "translated_text": "...",
  "original_language": "...",
  "contains_unclear_segments": true/false
}"""


def translate(raw_text: str) -> dict:
    user_content = f"Citizen submission: {raw_text}"
    return generate_json(SYSTEM_PROMPT, user_content)
