"""Converte um GeoTIFF de precipitacao (ex.: maxCAPPI de radar, em dBZ) no
arquivo grid_combinado.json que o backend consome.

Gera uma grade de celulas sobre a regiao de Itajuba, amostra o raster em cada
celula (media dos pixels validos), converte refletividade (dBZ) em taxa de chuva
(mm/h) via relacao Marshall-Palmer e classifica o risco nos 5 niveis.

Uso:
    python tiff_to_grid.py <caminho_do_tiff> [saida.json]

Observacoes:
- Temperatura e umidade NAO existem em um radar de chuva -> ficam null.
  (No pipeline real viriam dos TIFFs do ECMWF: t2m e r.)
- Se os valores do TIFF ja forem mm/h (e nao dBZ), defina ASSUME_DBZ = False.
"""

import json
import sys
from datetime import datetime, timezone

import numpy as np
from osgeo import gdal

# --- Configuracao ---------------------------------------------------------
# Regiao monitorada (lon_oeste, lon_leste, lat_sul, lat_norte).
REGION_NAME = "Itajuba-MG"
LON_WEST, LON_EAST = -45.56, -45.36
LAT_SOUTH, LAT_NORTH = -22.52, -22.32
GRID_COLS, GRID_ROWS = 5, 5  # numero de celulas na grade

ASSUME_DBZ = True  # True: valores em dBZ; False: valores ja em mm/h

# Limiares de risco por taxa de chuva (mm/h) - classes meteorologicas usuais.
def classify_risk(rain_mm_h):
    if rain_mm_h is None or rain_mm_h <= 0.0:
        return "nenhum"
    if rain_mm_h < 2.5:
        return "baixo"
    if rain_mm_h < 10.0:
        return "medio"
    if rain_mm_h < 50.0:
        return "alto"
    return "extremo"


def dbz_to_rain(dbz):
    # Marshall-Palmer: Z = 200 * R^1.6  ->  R = (Z/200)^(1/1.6), Z = 10^(dBZ/10)
    z = 10.0 ** (dbz / 10.0)
    return (z / 200.0) ** (1.0 / 1.6)


def main():
    if len(sys.argv) < 2:
        print("uso: python tiff_to_grid.py <tiff> [saida.json]")
        sys.exit(1)

    tiff_path = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else "data/processed/grid_combinado.json"

    ds = gdal.Open(tiff_path)
    if ds is None:
        print(f"nao foi possivel abrir: {tiff_path}")
        sys.exit(1)

    gt = ds.GetGeoTransform()
    band = ds.GetRasterBand(1)
    nodata = band.GetNoDataValue()
    arr = band.ReadAsArray().astype("float32")

    def to_pixel(lon, lat):
        col = int((lon - gt[0]) / gt[1])
        row = int((lat - gt[3]) / gt[5])
        return row, col

    cell_w = (LON_EAST - LON_WEST) / GRID_COLS
    cell_h = (LAT_NORTH - LAT_SOUTH) / GRID_ROWS

    cells = []
    com_dado = 0
    for r in range(GRID_ROWS):
        for c in range(GRID_COLS):
            lon0 = LON_WEST + c * cell_w
            lon1 = lon0 + cell_w
            lat0 = LAT_SOUTH + r * cell_h
            lat1 = lat0 + cell_h

            # janela de pixels que cai dentro da celula
            pr0, pc0 = to_pixel(lon0, lat1)  # canto superior-esquerdo
            pr1, pc1 = to_pixel(lon1, lat0)  # canto inferior-direito
            r_lo, r_hi = sorted((pr0, pr1))
            c_lo, c_hi = sorted((pc0, pc1))
            r_lo = max(r_lo, 0); c_lo = max(c_lo, 0)
            r_hi = min(r_hi, arr.shape[0] - 1); c_hi = min(c_hi, arr.shape[1] - 1)

            value = None
            if r_hi >= r_lo and c_hi >= c_lo:
                win = arr[r_lo:r_hi + 1, c_lo:c_hi + 1]
                valid = win[win != nodata] if nodata is not None else win.flatten()
                if valid.size:
                    value = float(valid.mean())

            if value is None:
                rain = None
            elif ASSUME_DBZ:
                rain = dbz_to_rain(value)
            else:
                rain = value

            if rain is not None:
                com_dado += 1

            cells.append({
                "id": f"cell-r{r}c{c}",
                "polygon": [
                    [round(lon0, 5), round(lat0, 5)],
                    [round(lon1, 5), round(lat0, 5)],
                    [round(lon1, 5), round(lat1, 5)],
                    [round(lon0, 5), round(lat1, 5)],
                    [round(lon0, 5), round(lat0, 5)],
                ],
                "metrics": {
                    "chuva_mm": round(rain, 2) if rain is not None else 0,
                    "temperatura": None,
                    "umidade": None,
                    "grau_risco": classify_risk(rain),
                },
            })

    summary = {
        "region": {"name": REGION_NAME, "bbox": [LON_WEST, LAT_SOUTH, LON_EAST, LAT_NORTH]},
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": f"radar maxCAPPI -> {tiff_path}",
        "cells": cells,
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f"OK: {len(cells)} celulas ({com_dado} com dado de chuva) -> {out_path}")
    riscos = {}
    for cell in cells:
        g = cell["metrics"]["grau_risco"]
        riscos[g] = riscos.get(g, 0) + 1
    print("distribuicao de risco:", riscos)


if __name__ == "__main__":
    main()
