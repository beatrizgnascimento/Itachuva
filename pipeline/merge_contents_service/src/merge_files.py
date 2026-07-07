from datetime import datetime, timezone
import json
import re
import pandas as pd

import numpy as np

from shared.config.env import get_env
from shared.utils.datecycle import get_cycle

import rioxarray
import os
from xarray import Dataset, DataArray, apply_ufunc, where
import gc

import requests

def _normalize_reports(reports: pd.DataFrame, name: str):

    r = reports.copy()

    r['is_U'] = (r['nivel'] == 1).astype(int)
    r['is_D'] = (r['nivel'] == 2).astype(int)
    r['is_T'] = (r['nivel'] == 3).astype(int)
    r['is_Q'] = (r['nivel'] == 4).astype(int)
    r['is_C'] = (r['nivel'] == 5).astype(int)

    grouped = r.groupby(['latitude', 'longitude']).agg(
        U=('is_U', 'sum'),
        D=('is_D', 'sum'),
        T=('is_T', 'sum'),
        Q=('is_Q', 'sum'),
        C=('is_C', 'sum'),
        R=('id', 'count')
    )

    grouped[name] = (
        (grouped['U'] + 2 * grouped['D'] + 3 * grouped['T'] + 4 * grouped['Q'] + 5 * grouped['C']) - grouped['R']
    ) / (4 * grouped['R'])

    return grouped.drop(columns=["U", "D", "T", "Q", "C", "R"])

def merge_contents_service():
    forecasts = _get_forecasts()
    reports = _get_reports()

    grid_size = 0.002 # ~ 220m
    tp_forecast = forecasts[0]

    min_reports_threshold = 3 # Mínimo de relatos na mesma célula
    
    if reports is not None and not reports.empty and 'latitude' in reports.columns:
        reports['latitude'] = (reports['latitude'] / grid_size).round() * grid_size
        reports['longitude'] = (reports['longitude'] / grid_size).round() * grid_size
        
        counting = reports.groupby(['latitude', 'longitude']).size().reset_index(name='qtd')
        
        valid_coords = counting[counting['qtd'] >= min_reports_threshold]
        
        reports = reports.merge(valid_coords[['latitude', 'longitude']], on=['latitude', 'longitude'], how='inner')

    if reports is not None and not reports.empty:
        target_lats = np.sort(reports['latitude'].unique())
        target_lons = np.sort(reports['longitude'].unique())
        
        Fl_df = reports[reports['tipo'] == 'alagamento']
        R_df = reports[reports['tipo'] == 'chuva']
        
        if not Fl_df.empty:
            Fl_xr = _normalize_reports(Fl_df, "Fli").to_xarray()
            Fli_da = Fl_xr['Fli'].reindex(latitude=target_lats, longitude=target_lons, fill_value=0.0)
        else:
            Fli_da = DataArray(0.0, coords=[('latitude', target_lats), ('longitude', target_lons)])
            
        if not R_df.empty:
            R_xr = _normalize_reports(R_df, "Ri").to_xarray()
            Ri_da = R_xr['Ri'].reindex(latitude=target_lats, longitude=target_lons, fill_value=0.0)
        else:
            Ri_da = DataArray(0.0, coords=[('latitude', target_lats), ('longitude', target_lons)])
            
    else:
        y_vals = tp_forecast['y'].values
        x_vals = tp_forecast['x'].values
        
        lat_start = round(float(min(y_vals)) / grid_size) * grid_size
        lat_end = round(float(max(y_vals)) / grid_size) * grid_size
        lon_start = round(float(min(x_vals)) / grid_size) * grid_size
        lon_end = round(float(max(x_vals)) / grid_size) * grid_size
        
        target_lats = np.arange(lat_start, lat_end + grid_size, grid_size)
        target_lons = np.arange(lon_start, lon_end + grid_size, grid_size)
        
        Fli_da = DataArray(0.0, coords=[('latitude', target_lats), ('longitude', target_lons)])
        Ri_da = DataArray(0.0, coords=[('latitude', target_lats), ('longitude', target_lons)])

    L = _discretize_matrix(tp_forecast, [0, 20, 30, 60, 80, np.inf])
    C = _get_normalization_coeficient(tp_forecast)

    Fi = 0.25*L*(((tp_forecast-20*L) / 20) * C)
    Fi = Fi.clip(min=0)
     
    cur_Fi = Fi.rename({'y': 'latitude', 'x': 'longitude'})

    cur_Fi_aligned = cur_Fi.interp(
        latitude=target_lats,
        longitude=target_lons,
        method="nearest" 
    )

    raster_coverage, raster_height = _get_exog_vars()
    
    coverage_aligned = raster_coverage.interp(
        latitude=target_lats,
        longitude=target_lons,
        method="nearest"
    )

    if 'band' in coverage_aligned.dims:
        coverage_aligned = coverage_aligned.squeeze('band', drop=True)
    
    height_aligned = raster_height.interp(
        latitude=target_lats,
        longitude=target_lons,
        method="nearest"
    )
    if 'band' in height_aligned.dims:
        height_aligned = height_aligned.squeeze('band', drop=True)

    win_lat = min(5, len(target_lats))
    win_lon = min(5, len(target_lons))

    h_min = height_aligned.min()
    h_max = height_aligned.max()
    F_hgt_abs = 1.0 - ((height_aligned - h_min) / (h_max - h_min))
    F_hgt_abs = F_hgt_abs.fillna(0)

    area_mean = height_aligned.rolling(
        latitude=win_lat, longitude=win_lon, center=True, min_periods=1
    ).mean()
    
    diff_area = area_mean - height_aligned
    F_hgt_rel = where(diff_area > 0, diff_area, 0.0)
    
    if F_hgt_rel.max() > 0:
        F_hgt_rel = F_hgt_rel / F_hgt_rel.max()
    else:
        F_hgt_rel = where(F_hgt_rel >= 0, 0.0, 0.0)

    F_hgt = F_hgt_abs * F_hgt_rel

    water_mask = where(
        (coverage_aligned == 33) | (coverage_aligned == 26) | 
        (coverage_aligned == 31) | (coverage_aligned == 11), 
        1.0, 0.0
    )
    
    # Expande o risco para pixels vizinhos
    F_water = water_mask.rolling(
        latitude=win_lat, longitude=win_lon, center=True, min_periods=1
    ).max()
    F_water = F_water.fillna(0)

    danger = Dataset({
        'Fli': Fli_da,
        'Ri': Ri_da,
        'Fi': cur_Fi_aligned,
        'F_hgt': F_hgt,
        'F_water': F_water
    })

    danger = danger.fillna(0)

    weight_fl = 0.5   # Alagamento
    weight_r = 0.3    # Chuva reportada
    weight_fi = 0.2   # Previsão
    sum_base_weights = weight_fl + weight_r + weight_fi

    base_risk = (
        (danger['Fli'] * weight_fl) + 
        (danger['Ri'] * weight_r) + 
        (danger['Fi'] * weight_fi)
    ) / sum_base_weights

    amp_hgt = 0.30
    amp_water = 0.40

    amplifier = 1.0 + (danger['F_hgt'] * amp_hgt) + (danger['F_water'] * amp_water)

    danger['danger'] = (base_risk * amplifier).clip(max=1.0)

    limites_classes = [0, 0.2, 0.4, 0.6, 0.8, 1]
    danger['danger'] = _discretize_matrix(danger['danger'], limites_classes)
    
    danger = danger.drop(['Fli', 'Ri', 'Fi', 'F_hgt', 'F_water'])
    
    tp = forecasts[0].rename({'y': 'latitude', 'x': 'longitude'})
    t2m = forecasts[1].rename({'y': 'latitude', 'x': 'longitude'}) - 273.15
    r = forecasts[2].rename({'y': 'latitude', 'x': 'longitude'})

    df_danger = danger['danger'].to_dataframe().reset_index()
    df_filtered = df_danger[df_danger['danger'] > 1].dropna()

    cells = []
    half_grid = grid_size / 2 
    
    mapa_risco = {
        2: "baixo", 
        3: "medio", 
        4: "alto", 
        5: "extremo"
    }

    for idx, row in enumerate(df_filtered.itertuples()):
        lat = float(row.latitude)
        lon = float(row.longitude)
        classe_perigo = int(row.danger)
        
        rain_val = tp.sel(latitude=lat, longitude=lon, method='nearest').item()
        temp_val = t2m.sel(latitude=lat, longitude=lon, method='nearest').item()
        umid_val = r.sel(latitude=lat, longitude=lon, method='nearest').item()
        
        polygon = [
            [round(lon - half_grid, 4), round(lat - half_grid, 4)],
            [round(lon + half_grid, 4), round(lat - half_grid, 4)],
            [round(lon + half_grid, 4), round(lat + half_grid, 4)],
            [round(lon - half_grid, 4), round(lat + half_grid, 4)],
            [round(lon - half_grid, 4), round(lat - half_grid, 4)]
        ]
        
        cells.append({
            "id": f"itj-{idx+1:02d}",
            "polygon": polygon,
            "metrics": {
                "chuva_mm": round(float(rain_val), 1),
                "temperatura": round(float(temp_val), 1),
                "umidade": round(float(umid_val), 1),
                "grau_risco": mapa_risco.get(classe_perigo, "sem risco")
            }
        })
    
    if not cells:

        center_lat = -22.4247
        center_lon = -45.4601
        
        rain_val = tp.sel(latitude=center_lat, longitude=center_lon, method='nearest').item()
        temp_val = t2m.sel(latitude=center_lat, longitude=center_lon, method='nearest').item()
        umid_val = r.sel(latitude=center_lat, longitude=center_lon, method='nearest').item()
        
        polygon = [
            [round(center_lon - 0.125, 4), round(center_lat - 0.125, 4)],
            [round(center_lon + 0.125, 4), round(center_lat - 0.125, 4)],
            [round(center_lon + 0.125, 4), round(center_lat + 0.125, 4)],
            [round(center_lon - 0.125, 4), round(center_lat + 0.125, 4)],
            [round(center_lon - 0.125, 4), round(center_lat - 0.125, 4)]
        ]
        
        cells.append({
            "id": "itj-00",
            "polygon": polygon,
            "metrics": {
                "chuva_mm": round(float(rain_val), 1),
                "temperatura": round(float(temp_val), 1),
                "umidade": round(float(umid_val), 1),
                "grau_risco": "nenhum"
            }
        })
        
    geojson_output = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": {
            "name": "ECMWF",
            "raw_dir": "~/projects/Itachuva/pipeline/data/tiff"
        },
        "region": {
            "name": "Itajuba-MG",
            "center": {
                "latitude": -22.4247,
                "longitude": -45.4601
            }
        },
        "cells": cells
    }
    
    out_dir = 'data/geojson'
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "grid.json")

    with open(out_file, 'w') as file:
        json.dump(geojson_output, file, indent=4)
    

    
def _get_forecasts() -> tuple[DataArray]:
    cur_cycle = int(get_cycle())
    cur_time = datetime.now().hour

    time_diff = cur_time - cur_cycle

    next_step = round(time_diff / 3) * 3

    file_dir = get_env()['GTIFF_OUT']

    tp_dir = os.path.join(file_dir, 'tp')
    
    tp_files = [f for f in os.listdir(tp_dir) if os.path.isfile(os.path.join(tp_dir, f))]
    tp_files = sorted(tp_files, key=lambda s: [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)])

    loaded_tp_files = []
    fixed_tp_files = []

    cur_file = 0
    for i, file in enumerate(tp_files):
        if i * 3 > next_step:
            cur_file = i - 1
            break
        
        loaded_file = rioxarray.open_rasterio(os.path.join(tp_dir, file))
        loaded_file = loaded_file * 1000
        loaded_tp_files.append(loaded_file)

    prev = None

    for i, file in enumerate(loaded_tp_files):
        
        if i == 0:
            prev = file.copy()
            fixed_tp_files.append(file)
            continue
        
        file_fixed = (file - prev) / 3
        file_fixed = file_fixed.clip(min=0)
        prev = file.copy()

        fixed_tp_files.append(file_fixed)
        gc.collect()

    t2m_file_name = os.path.join(file_dir, 't2m', f"t2m_{next_step}h.tif")
    t2m_file = rioxarray.open_rasterio(t2m_file_name)
    
    r_file_name = os.path.join(file_dir, 'r', f"r_{next_step}h.tif")
    r_file = rioxarray.open_rasterio(r_file_name)

    return fixed_tp_files[cur_file], t2m_file, r_file
        


def _get_reports() -> pd.DataFrame:
    try:
        url = f"{get_env()['BACKEND_URL']}/ocorrencias"
        response = requests.get(url)
        data = response.json()
        
        return pd.DataFrame(data)
    except Exception as e:
        print("Não foi possível obter dataframes")
        print(e)
        return pd.DataFrame()

def _discretize_matrix(value: DataArray | Dataset, limits: list) -> DataArray | Dataset:
    binned = apply_ufunc(
        np.digitize, 
        value, 
        kwargs={'bins': limits, 'right': False},
        dask='allowed'
    )
    
    value = binned.where(
        (value >= limits[0]) & value.notnull()
    )

    return value

def _get_normalization_coeficient(value: DataArray | Dataset) -> DataArray | Dataset:
    result = value.copy()

    result = where(value < 60, 0.25, result)
    result = where(value >= 60, 0.125, result)

    return result

def _get_exog_vars() -> tuple[Dataset | DataArray, Dataset | DataArray]:
    path_coverage = "data/exog/coverage.tif"
    path_height = "data/exog/height.tif"

    raster_coverage = rioxarray.open_rasterio(path_coverage)
    raster_height = rioxarray.open_rasterio(path_height)

    min_lon, max_lon = -45.55, -45.35
    min_lat, max_lat = -22.53, -22.35

    if raster_coverage.rio.crs is None:
        raster_coverage.rio.write_crs("EPSG:4326", inplace=True)
        
    if raster_height.rio.crs is None:
        raster_height.rio.write_crs("EPSG:4326", inplace=True)

    raster_coverage = raster_coverage.rio.clip_box(
        minx=min_lon, miny=min_lat, maxx=max_lon, maxy=max_lat, crs="EPSG:4326"
    )
    raster_height = raster_height.rio.clip_box(
        minx=min_lon, miny=min_lat, maxx=max_lon, maxy=max_lat, crs="EPSG:4326"
    )

    raster_coverage = raster_coverage.rename({'y': 'latitude', 'x': 'longitude'})
    raster_height = raster_height.rename({'y': 'latitude', 'x': 'longitude'})

    return raster_coverage, raster_height

# def _get_variables_list():
#     vmap = {
#         "2t":"t2m"
#     }
    
#     vlist = get_env()['VARIABLES'].split("|")
#     result = []
#     for v in vlist:
#         vmapped = vmap.get(v)
#         if vmapped is None:
#             result.append(v)
#             continue
        
#         result.append(vmapped)
    
#     return result

