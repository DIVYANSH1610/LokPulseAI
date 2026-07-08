"""
Multi-provider LLM client.

Every agent that needs GenAI reasoning (Translation-assist, Vision,
Classification, Recommendation, Ask AI) or embeddings (Duplicate
Detection, the RAG knowledge store) goes through this single module —
retry logic, provider selection, and JSON-mode enforcement all live here
instead of being duplicated per-agent.

Three providers are supported, tried in this order for BOTH generation
and embeddings, using whichever API keys are actually set in the
environment:

    1. Gemini      (GEMINI_API_KEY)       — primary; native JSON mode,
                                             native multimodal (vision).
    2. Mistral     (MISTRAL_API_KEY)      — fallback; also has a native
                                             JSON response_format and a
                                             dedicated embeddings endpoint.
    3. HuggingFace (HUGGINGFACE_API_KEY)  — fallback; Inference API,
                                             instruct model for generation,
                                             sentence-transformers model
                                             for embeddings. No native
                                             JSON mode, so we parse the
                                             model's raw text more
                                             defensively than the other
                                             two providers.

If a provider is configured but the call fails (rate limit, network,
malformed response), we fall through to the next configured provider
rather than failing the whole request — this is what "multi-provider"
buys you operationally, not just "pick one at startup."

If NO provider has a key set, every call returns a clearly-labeled
`[MOCK]` response (generation) or a deterministic hash-based pseudo-
vector (embeddings), so the full 8-agent pipeline still runs end-to-end
for local dev/demo without any key at all. See _mock_response_for below.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import time
from typing import Any

import httpx

# --- provider configuration -------------------------------------------------

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
MISTRAL_MODEL = os.getenv("MISTRAL_MODEL", "mistral-small-latest")
MISTRAL_EMBED_MODEL = "mistral-embed"

HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")
HF_GENERATION_MODEL = os.getenv("HF_GENERATION_MODEL", "mistralai/Mistral-7B-Instruct-v0.3")
HF_EMBEDDING_MODEL = os.getenv("HF_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

# Generation and embedding fallback order — same priority for both, since
# a provider being reachable/configured is the deciding factor either way.
PROVIDER_ORDER = ["gemini", "mistral", "huggingface"]

MAX_RETRIES = 3
BASE_BACKOFF_SECONDS = 1.5


class LLMError(Exception):
    pass


def _configured_providers() -> list[str]:
    available = {
        "gemini": bool(GEMINI_API_KEY),
        "mistral": bool(MISTRAL_API_KEY),
        "huggingface": bool(HUGGINGFACE_API_KEY),
    }
    return [p for p in PROVIDER_ORDER if available[p]]


# --- mock mode (no provider configured) -------------------------------------

def _mock_response_for(system_prompt: str) -> dict[str, Any]:
    """Deterministic stand-in used when no API key is configured for any provider."""
    p = system_prompt.lower()
    if "translation normalizer" in p:
        return {
            "translated_text": "[MOCK] Translated citizen submission text.",
            "original_language": "hi",
            "contains_unclear_segments": False,
        }
    if "analyzing a citizen-uploaded photo" in p:
        return {
            "detected_issue": "pothole",
            "severity": "medium",
            "confidence": 0.7,
            "description": "Mock: a pothole is visible in the uploaded image.",
        }
    if "classify this citizen submission" in p:
        return {
            "category": "Road",
            "urgency_signal": "none",
            "location_mentioned": None,
            "one_line_summary": "[MOCK] Citizen reported a road issue.",
        }
    if "generating a development recommendation" in p:
        return {
            "recommended_action": "[MOCK] Repair/upgrade the reported facility.",
            "reasoning": ["Mock reasoning point based on retrieved context."],
            "estimated_budget_inr_cr": 1.2,
            "expected_beneficiaries": 5000,
            "relevant_scheme": "Mock Scheme",
            "priority_rank": 1,
            "estimated_timeline_months": 6,
            "confidence": 0.5,
        }
    if "ask ai" in p:
        return {
            "answer": "[MOCK] I can help you navigate LokPulse AI, but this response is a placeholder because no LLM provider key is set. Set GEMINI_API_KEY, MISTRAL_API_KEY, or HUGGINGFACE_API_KEY to get real, grounded answers.",
            "suggested_actions": ["Set an LLM provider key in backend/.env", "Run backend/scripts/ingest_knowledge.py"],
            "used_live_data": False,
        }
    return {}


def _mock_embedding(text: str) -> list[float]:
    """
    Identical text -> identical vector, but similarity between different
    texts is NOT meaningful — this only proves pipeline wiring, not real
    duplicate-detection or retrieval quality. A real provider key is
    required for that.
    """
    h = hashlib.sha256(text.encode()).digest()
    return [b / 255.0 for b in h[:32]]


# --- Gemini ------------------------------------------------------------------

def _gemini_generate_json(system_prompt: str, user_content: str) -> dict[str, Any]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_content}"}]}],
        "generationConfig": {"response_mime_type": "application/json", "temperature": 0.2},
    }
    resp = httpx.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=30.0)
    if resp.status_code == 503:
        raise LLMError("503 from Gemini (transient)")
    resp.raise_for_status()
    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(text)


def _gemini_embed(text: str) -> list[float]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={GEMINI_API_KEY}"
    resp = httpx.post(url, json={"content": {"parts": [{"text": text}]}}, timeout=30.0)
    resp.raise_for_status()
    return resp.json()["embedding"]["values"]


# --- Mistral -------------------------------------------------------------

def _mistral_generate_json(system_prompt: str, user_content: str) -> dict[str, Any]:
    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {MISTRAL_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": MISTRAL_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
    }
    resp = httpx.post(url, json=payload, headers=headers, timeout=30.0)
    resp.raise_for_status()
    text = resp.json()["choices"][0]["message"]["content"]
    return json.loads(text)


def _mistral_embed(text: str) -> list[float]:
    url = "https://api.mistral.ai/v1/embeddings"
    headers = {"Authorization": f"Bearer {MISTRAL_API_KEY}", "Content-Type": "application/json"}
    resp = httpx.post(url, json={"model": MISTRAL_EMBED_MODEL, "input": [text]}, headers=headers, timeout=30.0)
    resp.raise_for_status()
    return resp.json()["data"][0]["embedding"]


# --- HuggingFace Inference API ------------------------------------------------

def _extract_json_block(raw_text: str) -> dict[str, Any]:
    """
    HuggingFace instruct models don't have a native JSON mode like Gemini
    or Mistral, so the raw generation may include the prompt echoed back,
    markdown fences, or leading/trailing chatter around the JSON object.
    Pull out the first {...} block and parse that rather than assuming
    the whole response is clean JSON.
    """
    match = re.search(r"\{.*\}", raw_text, re.DOTALL)
    if not match:
        raise LLMError("No JSON object found in HuggingFace response")
    return json.loads(match.group(0))


def _huggingface_generate_json(system_prompt: str, user_content: str) -> dict[str, Any]:
    url = f"https://api-inference.huggingface.co/models/{HF_GENERATION_MODEL}"
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
    prompt = (
        f"<s>[INST] {system_prompt}\n\n{user_content}\n\n"
        f"Respond with ONLY the JSON object, no other text. [/INST]"
    )
    payload = {"inputs": prompt, "parameters": {"temperature": 0.2, "max_new_tokens": 512, "return_full_text": False}}
    resp = httpx.post(url, json=payload, headers=headers, timeout=45.0)
    resp.raise_for_status()
    data = resp.json()
    generated = data[0]["generated_text"] if isinstance(data, list) else data.get("generated_text", "")
    return _extract_json_block(generated)


def _huggingface_embed(text: str) -> list[float]:
    url = f"https://api-inference.huggingface.co/models/{HF_EMBEDDING_MODEL}"
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
    resp = httpx.post(url, json={"inputs": text, "options": {"wait_for_model": True}}, headers=headers, timeout=30.0)
    resp.raise_for_status()
    vector = resp.json()
    # feature-extraction on a sentence-transformers model returns either a
    # flat vector or a list of token vectors depending on model config —
    # mean-pool over tokens if needed so callers always get one flat vector.
    if isinstance(vector[0], list):
        dim = len(vector[0])
        pooled = [sum(tok[i] for tok in vector) / len(vector) for i in range(dim)]
        return pooled
    return vector


_GENERATORS = {"gemini": _gemini_generate_json, "mistral": _mistral_generate_json, "huggingface": _huggingface_generate_json}
_EMBEDDERS = {"gemini": _gemini_embed, "mistral": _mistral_embed, "huggingface": _huggingface_embed}


# --- public API ----------------------------------------------------------------

def generate_json(system_prompt: str, user_content: str) -> dict[str, Any]:
    """
    Tries each configured provider in PROVIDER_ORDER, with retry+backoff
    per provider, falling through to the next provider on repeated
    failure rather than giving up immediately. Returns a mock response if
    no provider is configured at all.
    """
    providers = _configured_providers()
    if not providers:
        return _mock_response_for(system_prompt)

    last_err: Exception | None = None
    for provider in providers:
        fn = _GENERATORS[provider]
        for attempt in range(MAX_RETRIES):
            try:
                return fn(system_prompt, user_content)
            except Exception as exc:  # noqa: BLE001
                last_err = exc
                if attempt < MAX_RETRIES - 1:
                    time.sleep(BASE_BACKOFF_SECONDS * (2**attempt))
                continue
        # exhausted retries for this provider — fall through to the next one

    raise LLMError(f"All configured providers ({providers}) failed. Last error: {last_err}")


def embed_text(text: str) -> list[float]:
    """
    Same fallback chain as generate_json. Note: vectors from different
    providers are NOT comparable to each other (different embedding
    spaces/dimensions) — if a provider fails mid-corpus and a different
    one picks up the next call, similarity scores against
    already-embedded rows will be meaningless until everything is
    re-embedded with one consistent provider. Pin one provider's key in
    production rather than relying on the fallback chain for embeddings.
    """
    providers = _configured_providers()
    if not providers:
        return _mock_embedding(text)

    last_err: Exception | None = None
    for provider in providers:
        fn = _EMBEDDERS[provider]
        try:
            return fn(text)
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            continue

    raise LLMError(f"All configured providers ({providers}) failed for embedding. Last error: {last_err}")


def active_provider() -> str | None:
    """Which provider would be used right now — surfaced in /health for debugging."""
    providers = _configured_providers()
    return providers[0] if providers else None
