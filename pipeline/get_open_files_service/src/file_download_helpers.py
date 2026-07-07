import os

from shared.utils.grib_processing import get_grib_folder

def check_file_download(step_count: int):
    
    exists = os.path.exists(get_grib_folder())

    if exists is False:
        return False

    found_files = len([f for f in os.listdir(get_grib_folder()) if os.path.isfile(os.path.join(get_grib_folder(), f))])

    print(f"Encontrados {found_files} arquivos.")
    
    return found_files >= step_count