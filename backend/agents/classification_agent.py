"""Issue Classification Agent — Section 5.4"""
from __future__ import annotations

import json

from integrations.llm_client import generate_json

SYSTEM_PROMPT = """Classify this citizen submission into exactly one primary category
and detect urgency signals from the language used.

Categories: Road, Health, Education, Agriculture, Water, Electricity,
Women Safety, Transport, Employment, Sanitation, Other

Return strict JSON:
{
  "category": "...",
  "urgency_signal": "none | recurring_seasonal | acute_recent_incident",
  "location_mentioned": "extract any place name/landmark mentioned, or null",
  "one_line_summary": "..."
}"""


def classify(translated_text: str, vision_agent_output: dict | None = None) -> dict:
    user_content = (
        f"Submission (translated): {translated_text}\n"
        f"Attached image analysis (if any): {json.dumps(vision_agent_output) if vision_agent_output else 'none'}"
    )
    return generate_json(SYSTEM_PROMPT, user_content)
