from __future__ import annotations

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = BASE_DIR / "data" / "output"


def setup_files(combined_path: Path) -> Path:
    """
    Converte o grid combinado em uma imagem matricial .tiff simulada.
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    tiff_path = OUTPUT_DIR / "risco_itajuba.tiff"
    tiff_path.write_text(
        "TIFF SIMULADO - matriz espacial gerada a partir do grid combinado."
    )

    metadata_path = OUTPUT_DIR / "risco_itajuba_meta.txt"
    metadata_path.write_text(f"Fonte: {combined_path}\nFormato: GeoTIFF simulado")

    return tiff_path


if __name__ == "__main__":
    from combine_data import combine_data
    from get_open_files import simulate_download

    raw = simulate_download()
    combined = combine_data(raw)
    tiff = setup_files(combined)
    print(f"Arquivo TIFF criado em {tiff}")
