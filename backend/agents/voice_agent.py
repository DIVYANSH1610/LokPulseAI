"""
Voice Agent — Section 5.1

Single-purpose: transcribe audio to raw text. Does NOT summarize — that
stays in the Classification Agent's `one_line_summary` field so there's
exactly one source of truth for summaries (see the design note in the
spec).

Two real transcription paths, tried in this order:

  1. Local Whisper via `faster-whisper` — genuinely free, no API key,
     no Google Cloud account, no billing enabled anywhere. Runs on your
     own machine/server (CPU is fine for the "tiny"/"base" model sizes
     at hackathon scale — slower than a cloud API, but $0 forever).
     This is the recommended default if you don't want to touch GCP
     billing at all.
  2. Cloud Speech-to-Text — better accuracy and language coverage, but
     requires a GCP billing account enabled (the free-tier quota still
     needs a card on file, per Google's own billing FAQ). Only used if
     GOOGLE_APPLICATION_CREDENTIALS is set AND faster-whisper isn't
     installed/preferred.

If neither is set up, falls back to a mock transcript.
"""
from __future__ import annotations

import os

_whisper_model = None  # lazy-loaded singleton, avoids reloading the model per call


def _local_whisper_available() -> bool:
    try:
        import faster_whisper  # noqa: F401

        return True
    except ImportError:
        return False


def _transcribe_with_local_whisper(audio_bytes: bytes) -> dict:
    global _whisper_model
    from faster_whisper import WhisperModel

    if _whisper_model is None:
        model_size = os.getenv("WHISPER_MODEL_SIZE", "base")  # tiny/base/small — bigger = slower on CPU
        _whisper_model = WhisperModel(model_size, device="cpu", compute_type="int8")

    import io

    segments, info = _whisper_model.transcribe(io.BytesIO(audio_bytes))
    transcript = " ".join(seg.text.strip() for seg in segments)
    return {"raw_transcript": transcript, "detected_language": info.language}


def transcribe(audio_bytes: bytes | None, raw_text_fallback: str | None = None) -> dict:
    """
    For local/demo runs without any transcription backend wired up,
    if `raw_text_fallback` is provided (e.g. a text/WhatsApp submission),
    it is passed straight through — those channels skip this agent
    entirely in the real pipeline (see graph/pipeline.py).
    """
    if raw_text_fallback is not None:
        return {"raw_transcript": raw_text_fallback, "detected_language": "unknown"}

    if audio_bytes is not None and _local_whisper_available():
        return _transcribe_with_local_whisper(audio_bytes)

    if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        return {
            "raw_transcript": "[MOCK TRANSCRIPT] No transcription backend configured. "
            "Run `pip install faster-whisper --break-system-packages` for a free, "
            "no-account local option, or set GOOGLE_APPLICATION_CREDENTIALS for "
            "Cloud Speech-to-Text (requires GCP billing enabled).",
            "detected_language": "unknown",
        }

    # Real Cloud Speech-to-Text implementation sketch (requires google-cloud-speech):
    #
    # from google.cloud import speech
    # client = speech.SpeechClient()
    # audio = speech.RecognitionAudio(content=audio_bytes)
    # config = speech.RecognitionConfig(
    #     encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
    #     language_code="hi-IN",
    #     alternative_language_codes=["en-IN", "bn-IN", "ta-IN", "te-IN"],
    # )
    # response = client.recognize(config=config, audio=audio)
    # transcript = " ".join(r.alternatives[0].transcript for r in response.results)
    # return {"raw_transcript": transcript, "detected_language": "auto"}

    raise NotImplementedError(
        "GOOGLE_APPLICATION_CREDENTIALS is set but google-cloud-speech isn't wired in yet — "
        "uncomment the sketch above, or just install faster-whisper for the free path instead."
    )
