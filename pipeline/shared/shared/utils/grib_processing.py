import re
from typing import Any, List
import cfgrib
import os

import numpy as np
from xarray import Dataset
from shared.config.env import get_env
from shared.utils.datecycle import get_cycle, get_date

# heightAboveGround: 2, 10, 100;
# isobaricInhPa;
# surface;

def get_grib_name(step: str, group: str = None, resolution_type: str = None, analysis_type: str = None, open_data: bool = True):
    """Retorna o nome de um arquivo baseado em um modelo padrão para os nomes dos arquivos grib do projeto.
        Arquivos `open` possuem um padrão distinto dos restricted:
        - `open`: {get_date()}{get_cycle()}0000-{step}h-oper-fc.grib2;
        - restricted: {group}-{get_date()}{get_cycle()}0000-{step}h-{resolution_type}-oper-{analysis_type}.grib2;

    :param step: Step ao qual o arquivo se refere.
    :param group: Grupo correspondente ao arquivo. Pode ser obtido pelo Enum FileGroup.
    :param resolution_type: Forma de calcular previsões utilizada para gerar o arquivo.
    :param analysis_type: Tipo de análise utilizada para gerar o arquivo.
    :param open_data: Indica se o arquivo alvo é do tipo `open` ou não.
    :return: {group}-{get_date()}{get_cycle()}0000-{step}h-{resolution_type}-oper-{analysis_type}.grib2 se o arquivo for `restricted` e {get_date()}{get_cycle()}0000-{step}h-oper-fc.grib2 se for `open`
    """
    if open_data:
        return f"{get_date()}{get_cycle()}0000-{step}h-oper-fc.grib2"

    return f"{group}-{get_date()}{get_cycle()}0000-{step}h-{resolution_type}-oper-{analysis_type}.grib2"

def get_grib_step(fname):
     """Retorna o step do arquivo com base em seu nome.

        :param fname: Nome do arquivo.
        :return: Step contido no nome do arquivo.
     """
     step_pattern = r"[-|_](\d{1,3})h"
     return re.findall(step_pattern, fname)[0]

def get_grib_folder():
    """Retorna a pasta em que o arquivo será armazenado com base na data e no ciclo atual.
    
        :return: get_env()['GRIB_OUT']/ecmwf_{get_date()}_{get_cycle()}z
    """
    return os.path.join(get_env()['GRIB_OUT'], f"ecmwf_{get_date()}_{get_cycle()}z")

def get_grib_info(name: str, open_data: bool = True):
    """Retorna as informações relacionadas ao nome do arquivo:
        - `open`: step e analysis_type
        - `restricted`: step, group, resolution_type e analysis_type

        :return: Dicionário com step e analysis_type se for do tipo `open` e com step, group, resolution_type e analysis_type se for do tipo `restricted`.
    """
    if not open_data:
        restricted_labels_pattern = r"nat_(a[1-3])_ifs-(ens-cf|da)_od_oper_(fc|ssd|an).*_(\d{1,3})h"
        restricted_labels = re.findall(restricted_labels_pattern, name)[0]

        return {
            "step": restricted_labels[3],
            "group": restricted_labels[0],
            "resolution_type": restricted_labels[1],
            "analysis_type": restricted_labels[2],
        }
    
    open_labels_pattern = r"(\d{1,3})h-oper-(fc|ssd|an)"
    open_labels = re.findall(open_labels_pattern, name)[0]

    return {
        "step": open_labels[0],
        "analysis_type": open_labels[1],
    }


def cut_to(data: np.ndarray[Any, np.dtype[Any]], region: tuple[float, float, float, float]):
    """Recorta um conjunto de dados numpy para uma região retangular.
        
        :param data: Conjunto de dados.
        :param region: Região de recorte dada por: LAT_NORTH, LAT_SOUTH, LON_WEST, LON_EAST.
        :return: Conjunto de dados limitado ao polígono fornecido.
    """
    lat_min, lat_max, lon_min, lon_max = region

    if data.longitude.min().values >= 0 and data.longitude.max().values > 180:
        data = data.assign_coords(longitude=(((data.longitude + 180) % 360) - 180))
        data = data.sortby('longitude')
        
    return data.sel(latitude=slice(lat_min, lat_max), longitude=slice(lon_min, lon_max))

def get_grib_data(file: str):
    """Realiza a leitura de um arquivo .grib.
        
        :param file: Caminho para o arquivo.
        :return: Lista de Datasets com variaveis separadas por tipos definidos a partir de uma heurística do cfgrib.
    """
    index_files_path = os.path.join(get_grib_folder(), "index_files")

    os.makedirs(index_files_path, exist_ok=True)

    index_file = os.path.join(index_files_path, os.path.basename(file))

    return cfgrib.open_datasets(file, backend_kwargs={'indexpath': index_file})

def filter_datasets(datasets: List[Dataset], vars: set):
    """Realiza a filtragem de uma lista de datasets a partir de um conjunto de variáveis.
        
        :param datasets: Lista com datasets a serem filtrados.
        :param vars: Set com os nomes das variáveis a serem encontradas mantidas.
        :return: Primeiro dataset que contém todas as variáveis do conjunto.
    """
    grib_data = None

    for data in datasets:
        if vars.issubset(set(data.data_vars)):
            grib_data = data[list(vars)]
            break

    return grib_data