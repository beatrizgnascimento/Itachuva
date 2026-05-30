from __future__ import annotations

from combine_data import combine_data
from clean_intermediates import clean_intermediates
from get_open_files import simulate_download
from setup_files import setup_files


def main() -> None:
    raw_dir = simulate_download()
    combined_path = combine_data(raw_dir)
    tiff_path = setup_files(combined_path)
    removed = clean_intermediates([raw_dir])

    print("Pipeline finalizado")
    print(f"TIFF gerado: {tiff_path}")
    print(f"Arquivos removidos: {removed}")


if __name__ == "__main__":
    main()
