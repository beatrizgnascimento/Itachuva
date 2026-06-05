from get_open_files_service.src.ecmwf_open import get_open_files
from setup_files_service.src.clip_variables import processing_grib
from shared.config.env import get_env
from shared.utils.datecycle import get_cycle, get_date

def file_generation():
    download_date = get_date()
    download_cycle = get_cycle()

    steps = list(range(0, 27, 3))

    get_open_files(download_date, cycle=download_cycle, params=get_env().get("VARIABLES"), steps=steps)
    processing_grib()
