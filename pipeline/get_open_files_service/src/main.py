from ecmwf_open import get_open_files
from file_download_helpers import check_file_download
from shared.config.env import init_env, get_env
import time


from shared.utils.datecycle import get_cycle, get_date

init_env()

download_date = get_date()
download_cycle = get_cycle()

steps = list(range(0, 27, 3))

if check_file_download(len(steps)):
    print("Arquivos já baixados. Ignorando download.")
    exit(0)

st = time.time()

get_open_files(download_date, cycle=download_cycle, params=get_env().get("VARIABLES"), steps=steps)

ed = time.time()

print("Time to download: ", ed-st)