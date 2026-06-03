import json
from os import getenv
import os
from dotenv import load_dotenv
import warnings

ENV = {}

def _get_credentials():
    api_credentials = None
    try:
        with open(getenv('CREDENTIALS_FILE')) as f:
            api_credentials = json.load(f)
        return api_credentials
    except Exception as e:
        print("Não foi possível ler o arquivo de credenciais:", e)
        return None

def init_env():
    """Inicializa e valida as variáveis do .env"""
    global ENV

    load_dotenv()

    ENV = dict(os.environ)

    grib_out = getenv('GRIB_OUT')
    tiff_out = getenv('GTIFF_OUT')
    variables = getenv('VARIABLES')
    credentials_file = getenv('CREDENTIALS_FILE')
    environment = getenv('ENVIRONMENT')
    cut = getenv('CUT')
    state = getenv('STATE')

    assert grib_out is not None and grib_out != '', "A variavel 'GRIB_OUT' não está configurada no .env, por favor inclua-a no arquivo. Observe .env.example para maiores detalhes."
    assert tiff_out is not None and tiff_out != '', "A variavel 'GTIFF_OUT' não está configurada no .env, por favor inclua-a no arquivo. Observe .env.example para maiores detalhes."
    assert credentials_file is not None and credentials_file != '', "A variavel 'CREDENTIALS_FILE' não está configurada no .env, por favor inclua-a no arquivo. Observe .env.example para maiores detalhes."
    assert environment is not None and environment != '', "A variavel 'ENVIRONMENT' não está configurada no .env, por favor inclua-a no arquivo. Observe .env.example para maiores detalhes."
    assert state is not None and state != '', "A variavel 'STATE' não está configurada no .env, por favor inclua-a no arquivo. Observe .env.example para maiores detalhes."
    
    
    assert cut is not None and cut != '', "A variavel 'CUT' não está configurada no .env, por favor inclua-a no arquivo. Observe .env.example para maiores detalhes."
    assert cut == "False" or cut == "True", "'CUT' pode ter apenas dois valores: 'True' ou 'False'"
    assert environment == "production" or environment == "development", "'ENVIRONMENT' pode ter apenas dois valores: 'production' ou 'development'"
    assert state == "training" or state == "execution", "'STATE' pode ter apenas dois valores: 'training' ou 'execution'"

    credentials = _get_credentials()
    
    assert credentials is not None, "O arquivo credentials.json não está configurado, por favor crie o arquivo. Observe credentials.json.example para maiores detalhes."
    assert credentials['ecmwf-open'] is not None, " A variavel 'ecmwf-open' não está configurada no credentials.json, por favor inclua-a no arquivo. Observe credentials.json.example para maiores detalhes."
    assert credentials['ecmwf-open']['url'] is not None, " A variavel 'ecmwf-open[url]' não está configurada no credentials.json, por favor inclua-a no arquivo. Observe credentials.json.example para maiores detalhes."

    ENV['CREDENTIALS'] = credentials

    if not variables: warnings.warn("A variavel 'VARIABLES' não está configurada no .env, caso ela seja necessária, inclua-a no arquivo. Observe .env.example para maiores detalhes.")
    
    return ENV

def get_env():
    """Retorna as variáveis do .env
    
        :return: Dicionário de variáveis de ambiente.
    """
    global ENV
    return ENV