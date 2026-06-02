from clip_variables import TARGET_VARS, processing_grib
from shared.config.env import get_env, init_env
from shared.utils.validate_files import verify_tiffs

init_env()

processing_grib() 
verify_tiffs(TARGET_VARS, get_env()['GTIFF_OUT'])