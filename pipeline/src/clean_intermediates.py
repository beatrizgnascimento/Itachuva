from __future__ import annotations

from pathlib import Path
from typing import Iterable


def clean_intermediates(paths: Iterable[Path]) -> int:
    """
    Remove arquivos temporarios pesados gerados em execucoes no Kubernetes.
    """
    removed = 0

    for base in paths:
        if not base.exists():
            continue

        for item in base.rglob("*"):
            if item.is_file():
                item.unlink()
                removed += 1

    return removed


if __name__ == "__main__":
    from get_open_files import RAW_DIR

    deleted = clean_intermediates([RAW_DIR])
    print(f"Arquivos removidos: {deleted}")
