import re
import pandas as pd

import numpy as np

from shared.config.env import get_env
from shared.utils.datecycle import get_date, get_cycle

import rioxarray
import os
from xarray import Dataset, DataArray, apply_ufunc, where
import gc

def merge_contents_service():
    forecasts = _get_forecasts()
    reports = _get_reports()

    Fis = []

    for forecast in forecasts:
        L = _discretize_dataset(forecast)
        C = _get_normalization_coeficient(forecast)

        Fi = 0.25*L*(((forecast-20*L) / 20) * C)
        Fis.append(Fi)
    
def _get_forecasts() -> list[DataArray]:
    file_dir = os.path.join(get_env()['GTIFF_OUT'], 'tp')
    files = [f for f in os.listdir(file_dir) if os.path.isfile(os.path.join(file_dir, f))]
    files = sorted(files, key=lambda s: [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)])

    loaded_files = []
    fixed_files = []

    for file in files:
        loaded_file = rioxarray.open_rasterio(os.path.join(file_dir, file))
        loaded_file = loaded_file * 1000
        loaded_files.append(loaded_file)

    prev = None

    for i, file in enumerate(loaded_files):
        if i == 0:
            prev = file.copy()
            fixed_files.append(file)
            continue
        
        prev = file.copy()
        file = (file - prev) / 3

        fixed_files.append(file)
        gc.collect()
    
    return fixed_files
        


def _get_reports() -> list[dict]:
    pass

def _discretize_dataset(value: DataArray | Dataset) -> DataArray | Dataset:
    limits_mmh = [0, 20, 30, 60, np.inf]
    
    binned = apply_ufunc(
        np.digitize, 
        value, 
        kwargs={'bins': limits_mmh, 'right': False},
        dask='allowed'
    )
    
    categorias = binned - 1
    
    value = categorias.where(
        (value >= limits_mmh[0]) & value.notnull()
    )

    return value

def _get_normalization_coeficient(value: DataArray | Dataset) -> DataArray | Dataset:
    result = value.copy()

    result = where(value < 60, 0.25, result)
    result = where(value >= 60, 0.125, result)

    return result

def _get_exog_vars() -> tuple[Dataset | DataArray, Dataset | DataArray]:
    path_relevo = "data/exog/relevo.tif"
    path_terreno = "data/exog/terreno.tif"

    raster_relevo = rioxarray.open_rasterio(path_relevo)
    raster_terreno = rioxarray.open_rasterio(path_terreno)

    raster_relevo = raster_relevo.rename({'y': 'latitude', 'x': 'longitude'})
    raster_terreno = raster_terreno.rename({'y': 'latitude', 'x': 'longitude'})

    return raster_relevo, raster_terreno

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

