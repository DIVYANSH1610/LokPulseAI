import os
from pathlib import Path

def write_file(filepath: str, content: str):
    """Creates directories if they don't exist and writes the content to the file."""
    path = Path(filepath)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")
    print(f"✅ Generated: {filepath}")