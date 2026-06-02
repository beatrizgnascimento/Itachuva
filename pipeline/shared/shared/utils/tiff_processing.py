import cv2
import xarray as xr
import numpy as np
import os
from osgeo import gdal
from shared.config.env import get_env
from shared.enums.coords_enum import Coords
from shared.utils.grib_processing import cut_to

gdal.UseExceptions()

def _get_region_shape(data: xr.DataArray):
    lats = data['latitude'].values
    lons = data['longitude'].values

    lat_max = lats.max()
    lat_min = lats.min()
    lon_min = lons.min()
    lon_max = lons.max()

    return (lon_min, lat_min, lon_max, lat_max)

def _xarray_to_tiff(data: xr.DataArray, path: str):

    lon_min, lat_min, lon_max, lat_max = _get_region_shape(data)

    arr = data.values.squeeze()
    h, w = arr.shape

    pixel_width  = (lon_max - lon_min) / (w - 1)
    pixel_height = (lat_max - lat_min) / (h - 1)

    gt = (lon_min, pixel_width, 0, lat_max, 0, -pixel_height)
    
    driver = gdal.GetDriverByName("GTiff")
    dst = driver.Create(path + ".tif", w, h, 1, gdal.GDT_Float32)

    dst.SetGeoTransform(gt)
    dst.SetProjection('EPSG:4326')
    dst.GetRasterBand(1).WriteArray(arr)
    
    dst.FlushCache()

def write_tiff(data: xr.DataArray, var_name: str, step: int, multi_layer: bool=False, layer_name: str | None = None):
    str_step = str(step) + "h"
    
    if not multi_layer:
        base_path = os.path.join(get_env()['GTIFF_OUT'], var_name)  
        file_name = f"{var_name}_{str_step}"
    else:
        base_path = os.path.join(get_env()['GTIFF_OUT'], var_name, str_step)
        file_name = f"{var_name}_{layer_name}"

    os.makedirs(base_path, exist_ok=True)
    path = os.path.join(base_path, file_name)

    if get_env()['CUT'] == "True":
        data = cut_to(data, Coords.ITAJUBA)
    
    if 'time' in data.dims and data['time'].size > 1:
        data_to_save = data.isel(time=0)
    else:
        data_to_save = data
     
    _xarray_to_tiff(data_to_save, path)

    return data_to_save