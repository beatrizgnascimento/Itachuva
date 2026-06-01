from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

BASE_DIR = Path(__file__).resolve().parents[1]
PROCESSED_DIR = BASE_DIR / "data" / "processed"


def combine_data(raw_dir: Path) -> Path:
    """
    Gera um contrato estruturado com celulas espaciais e metricas climaticas.
    """
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    summary: Dict[str, object] = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": {
            "name": "ECMWF",
            "raw_dir": str(raw_dir),
        },
        "region": {
            "name": "Itajuba-MG",
            "center": {
                "latitude": -22.4247,
                "longitude": -45.4601,
            },
        },
        "cells": [
            {
                "id": "itj-01",
                "polygon": [
                    [-45.4685, -22.4295],
                    [-45.4630, -22.4295],
                    [-45.4630, -22.4240],
                    [-45.4685, -22.4240],
                    [-45.4685, -22.4295],
                ],
                "metrics": {
                    "chuva_mm": 72.1,
                    "temperatura": 23.8,
                    "umidade": 84,
                    "grau_risco": "alto",
                },
            },
            {
                "id": "itj-02",
                "polygon": [
                    [-45.4590, -22.4315],
                    [-45.4525, -22.4315],
                    [-45.4525, -22.4250],
                    [-45.4590, -22.4250],
                    [-45.4590, -22.4315],
                ],
                "metrics": {
                    "chuva_mm": 58.4,
                    "temperatura": 24.2,
                    "umidade": 81,
                    "grau_risco": "medio",
                },
            },
            {
                "id": "itj-03",
                "polygon": [
                    [-45.4670, -22.4205],
                    [-45.4595, -22.4205],
                    [-45.4595, -22.4150],
                    [-45.4670, -22.4150],
                    [-45.4670, -22.4205],
                ],
                "metrics": {
                    "chuva_mm": 41.9,
                    "temperatura": 25.1,
                    "umidade": 76,
                    "grau_risco": "baixo",
                },
            },
        ],
    }

    output_path = PROCESSED_DIR / "grid_combinado.json"
    output_path.write_text(json.dumps(summary, indent=2))

    return output_path


if __name__ == "__main__":
    from get_open_files import simulate_download

    raw = simulate_download()
    combined = combine_data(raw)
    print(f"Grid combinado gerado em {combined}")
