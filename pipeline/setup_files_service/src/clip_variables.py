import os
import glob
import time
from shared.config.env import get_env
from shared.enums.coords_enum import Coords
from shared.utils.grib_processing import get_grib_data, get_grib_folder, get_grib_step
from shared.utils.processing_logger import ProcessingLogger
from shared.utils.tiff_processing import write_tiff

TARGET_VARS = {
    't2m': 'Temperatura a 2m',
    'tp': 'Precipitação total',
    'r': 'Umidade relativa do ar'
}

_logger = ProcessingLogger(TARGET_VARS)

def convert_grib(grib_file: str, step: int):
    if not os.path.exists(grib_file):
        print(f"Arquivo não encontrado: {grib_file}")
        return
    
    try:
        print("Lendo arquivo GRIB...")

        datasets = get_grib_data(grib_file)

        if not datasets:
            print("Não foi possível abrir nenhum arquivo GRIB")
            return

        all_variables = {}
        for ds in datasets:
            for var_name in ds.data_vars:
                all_variables[var_name] = ds

        found_variables = {}
        for target_var in TARGET_VARS:

            if target_var in all_variables:
                found_variables[target_var] = all_variables[target_var]

        print(f"\nGerando geotiffs...")

        for var_name, source_ds in found_variables.items():
            try:
                var_data = source_ds[var_name]
                
                multi_level = len(var_data.shape) > 2

                if multi_level:
                    var_data = var_data.isel(isobaricInhPa=0)
                data_to_save = write_tiff(var_data, var_name, step)
                _logger.log_variable(data_to_save)
                
            except Exception as e:
                print(f"Erro em {var_name}: {e}")
                _logger.end_file(False)

        for ds in datasets:
            ds.close()
        
        _logger.end_file()

        return
        
    except Exception as e:
        print(f"Erro geral durante a conversão: {e}")
        _logger.end_file(False)
        return

def processing_grib():
    """Gera os arquivos tif com variaveis recortadas a partir dos arquivos grib disponíveis.
    
        :param input_folder: Pasta de entrada.
        :param output_folder: Pasta de saída.
    """
    input_folder = get_grib_folder()

    if not os.path.exists(input_folder):
        print(f"Pasta não encontrada: {input_folder}")
        return
    
    grib_files = glob.glob(os.path.join(input_folder,"*.grib2"))

    _logger.start_batch(len(grib_files))

    for i, file in enumerate(grib_files, 1):
        _logger.start_file(os.path.basename(file), i)
        step = get_grib_step(file)
        convert_grib(file, step)

    _logger.end_batch()