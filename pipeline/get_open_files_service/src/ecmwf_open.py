import json
import math
import requests
import re
import os
from shared.config.env import get_env
from shared.utils.grib_processing import get_grib_folder
from shared.utils.validate_files import validate_file
from shared.utils.retry import retry

def _download_file(download: requests.Response, file_name):
    """
    Realiza a escrita do stream de dados em disco exibindo uma barra de progresso no console.

    O arquivo é salvo no diretório retornado por `get_grib_folder()`. O download
    é processado em pedaços (chunks) de 1MB para eficiência de memória.

    :param download: Objeto response da biblioteca requests (com stream=True).
    :param file_name: Nome do arquivo de destino (ex: 'dados.grib2').
    """

    max_size = download.headers.get('Content-Length', len(download.content))
    cur_chunk = 0
    chunk_size = 1024*1024
    n_chunks = math.ceil(int(max_size) / chunk_size)

    final_stage = 50
    min_chunk = 0

    folder = get_grib_folder()

    if not os.path.exists(folder):
        os.makedirs(folder)

    bar = f'|{" "*final_stage }| 0.00%'
    
    with open(os.path.join(folder, file_name), "wb") as f:
        for chunk in download.iter_content(1024*1024): # 1 Mb
            if chunk:
                print(bar, end='\r')
                f.write(chunk)
                cur_chunk+=1
                

            cur_stage = math.floor((cur_chunk - min_chunk) / (n_chunks - min_chunk) * final_stage)
            bar = f'|{"#"*cur_stage}{" "*(final_stage - cur_stage)}| {(cur_chunk / n_chunks * 100):.2f}%'
        print(bar)
        print("Download concluído!")


def _is_target(path):
    """
    Fabrica uma função de filtro baseada em expressão regular.

    :param path: O padrão regex a ser buscado na string.
    :return: Uma função lambda que retorna True se o padrão for encontrado na entrada.
    """
    return lambda x: re.search(path, x) is not None


def _filter_file(file_url: str, params: str): 
    """
    Obtém e processa o arquivo de índice (.index) para calcular os Byte Ranges das variáveis desejadas.

    Faz o parse do índice JSON retornado pelo ECMWF para identificar onde começam e terminam
    os bytes das variáveis solicitadas (params), permitindo o download parcial do arquivo GRIB.

    :param file_url: URL base do arquivo (sem extensão).
    :param params: String com os parâmetros desejados separados por pipe (ex: 't2m|tp').
    :return: String formatada para o cabeçalho HTTP 'Range' (ex: 'bytes=0-500, 1000-1500').
    """
    print(f"Selecionando variaveis: {params or 'Todas'}")

    index_file = retry(
        lambda: requests.get(f"{file_url}.index", stream=True)
    )

    decoded_index = index_file.text.split('\n')

    path = rf"\"param\"\: \"({params or '.*'})\", \"_offset\": \d*, \"_length\": \d*"
    
    json_index = ""
    ranges = "bytes="
    for item in filter(_is_target(path), decoded_index):
        json_index = json.loads(item)
        start = json_index['_offset']
        end = start + json_index['_length']

        ranges += f"{start}-{end}, "
    
    return ranges.rstrip(', ')


def get_open_files(date: str, params: str = None, steps: list[int] = list(range(0, 147, 3)) + list(range(150, 342, 6)), cycle: str = "00"):

    """
    Orquestra o download dos arquivos de dados abertos (Open Data) do ECMWF.

    Itera sobre os passos de tempo (steps), calcula os ranges de bytes necessários para
    as variáveis solicitadas e gerencia o download e validação dos arquivos GRIB2.

    :param date: Data de referência da previsão no formato 'YYYYMMDD'.
    :param params: String de variáveis a filtrar separadas por pipe (ex: '2t|msl'). Se None, baixa tudo.
    :param steps: Lista de horas de previsão (forecast steps) a serem baixadas.
    :param cycle: Ciclo da previsão, deve ser "00" ou "12".
    :return: Uma tupla contendo a lista de steps processados e o ciclo utilizado.
    :raises ValueError: Se o formato dos parâmetros ou do ciclo for inválido.
    """

    if params is not None and re.search(r"^[a-z0-9]+(?:\|[a-z0-9]+)*$", params) is None:
        raise ValueError("Valor inválido pra params: Informe-os seguindo p1|p2|p3|...|pn")

    if cycle != "00" and cycle != "12":
        raise ValueError("Valor inválido para cycle: Escolha entre 00 ou 12")

    credentials = get_env()['CREDENTIALS']['ecmwf-open']
    base_url = credentials['url']

    headers = {
            "Accept": "*/*",
    }

    payload = {
        "stream": "oper",
        "type": "fc",
        "resolution": "0p25",
        "model": "ifs",
    }

    for step in steps:
        file_name = f"{date}{cycle}0000-{step}h-{payload['stream']}-{payload['type']}"
        file_url = f"{base_url}/{date}/{cycle}z/{payload['model']}/{payload['resolution']}/{payload['stream']}/{file_name}"
        
        print(f"Buscando arquivo de indice para o step {step}")
        print(file_url + ".index")
        
        try:
            headers['Range'] = _filter_file(file_url, params)

            file =\
            retry(
                lambda: _get_file(file_url, headers, params.split("|") if params is not None else None), retry_time=300
            )
            retry(
                lambda: _download_file(file, f"{file_name}.grib2")
            )
        except Exception as e:
            print(e)
            continue
    return (steps, cycle)

def _get_file(file_url: str, headers: dict, variables: list[str] | None):
    """
    Executa a requisição GET do arquivo e valida o conteúdo binário recebido.

    Utiliza `validate_file` para inspecionar o conteúdo em memória (bytes) antes de retornar,
    garantindo que as variáveis solicitadas via Range Header foram efetivamente recebidas.

    :param file_url: URL completa para o arquivo .grib2.
    :param headers: Dicionário de headers HTTP (deve conter o 'Range' calculado).
    :param variables: Lista de strings com os nomes das variáveis esperadas.
    :return: Objeto requests.Response pronto para ser salvo.
    :raises Exception: Se as variáveis solicitadas não forem encontradas no conteúdo baixado.
    """
    response = requests.get(f"{file_url}.grib2",  
                            headers=headers,
                            stream=True
                        )

    not_found = validate_file(response.content, variables)

    if not_found:
        raise Exception(f"Falha ao baixar o arquivo: Variáveis solicitadas indisponíveis: {not_found}")

    return response