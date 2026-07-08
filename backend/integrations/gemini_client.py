"""
DEPRECATED: this module now just re-exports integrations.llm_client for
backward compatibility with anything still importing the old path. The
real implementation — including Mistral and HuggingFace fallback
providers — lives in llm_client.py. Import from there directly in new code.
"""
from integrations.llm_client import (  # noqa: F401
    LLMError as GeminiError,
    embed_text,
    generate_json,
)
