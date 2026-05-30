from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import List

BASE_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = BASE_DIR / "data" / "raw"


def simulate_download() -> Path:
    """
    Simula a conexao com o FTP do ECMWF e gera arquivos .grib locais.
    """
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    files: List[Path] = []

    for idx in range(1, 4):
        file_path = RAW_DIR / f"ecmwf_{timestamp}_slice_{idx}.grib"
        file_path.write_text(
            "GRIB SIMULADO - arquivos meteorologicos de alta resolucao."
        )
        files.append(file_path)

    manifest = {
        "fonte": "ECMWF",
        "timestamp_utc": timestamp,
        "arquivos": [file.name for file in files]
    }

    (RAW_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2))

    return RAW_DIR


if __name__ == "__main__":
    simulate_download()
    print(f"Arquivos simulados em {RAW_DIR}")
