from ecmwf_open import get_open_files
from file_download_helpers import check_file_download
from shared.config.env import init_env, get_env
import time
import os


from shared.utils.datecycle import get_cycle, get_date

init_env()

download_date = get_date()
download_cycle = get_cycle()

if check_file_download():
    print("Arquivos já baixados. Ignorando download.")
    exit(0)

st = time.time()

get_open_files(download_date, cycle=download_cycle, params=get_env().get("VARIABLES"), steps=list(range(0, 27, 3)))

ed = time.time()

print("Time to download: ", ed-st)