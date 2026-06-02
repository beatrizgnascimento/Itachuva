import os

from shared.utils.grib_processing import get_grib_folder

def check_file_download(step_count: int):

    return os.path.exists(get_grib_folder()) and len([f for f in os.listdir(get_grib_folder()) if os.path.isfile(f)]) == step_count