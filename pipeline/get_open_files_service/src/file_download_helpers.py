import os

from shared.utils.grib_processing import get_grib_folder

def check_file_download():
    return os.path.exists(get_grib_folder())