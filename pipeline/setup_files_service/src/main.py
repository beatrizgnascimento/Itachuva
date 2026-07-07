
from clip_variables import TARGET_VARS, processing_grib
from shared.config.env import get_env, init_env
from shared.utils.validate_files import verify_tiffs
import os
from setup_helpers import remove_temp_files, runned_once

init_env()

removed = remove_temp_files()

if removed is False and runned_once() is True:
    os._exit(0)

processing_grib() 
verify_tiffs(TARGET_VARS, get_env()['GTIFF_OUT'])

os._exit(0)