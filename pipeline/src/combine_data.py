from __future__ import annotations

import json
from pathlib import Path
from typing import Dict

BASE_DIR = Path(__file__).resolve().parents[1]
PROCESSED_DIR = BASE_DIR / "data" / "processed"


def combine_data(raw_dir: Path) -> Path:
    """
    Simula a combinacao de camadas climaticas com base em artigos cientificos.
    """
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    summary: Dict[str, object] = {
        "entrada": str(raw_dir),
        "metodo": "fusao de variaveis atmosfericas",
        "ponderacoes": {
            "chuva": 0.5,
            "temperatura": 0.3,
            "umidade": 0.2
        }
    }

    output_path = PROCESSED_DIR / "grid_combinado.json"
    output_path.write_text(json.dumps(summary, indent=2))

    return output_path


if __name__ == "__main__":
    from get_open_files import simulate_download

    raw = simulate_download()
    combined = combine_data(raw)
    print(f"Grid combinado gerado em {combined}")
