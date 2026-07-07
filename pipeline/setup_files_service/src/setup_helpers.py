import os
import shutil
from shared.utils.grib_processing import get_grib_folder
from shared.config.env import get_env

def remove_temp_files():
    cur_grib_dir = os.path.basename(get_grib_folder())
    dirs_list = os.listdir(get_env()['GRIB_OUT'])

    removed = False

    for i, dir in enumerate(dirs_list):
        if dir == cur_grib_dir:
            continue

        removed = True
        shutil.rmtree(os.path.join(get_env()['GRIB_OUT'], dir))

    return removed

def runned_once():
    try:
        return len(os.listdir(get_env()['GTIFF_OUT'])) >= 3
    except:
        return False