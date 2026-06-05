import time
from typing import Callable

import requests


def retry(function: Callable[[], requests.Response], max_trials: int = 10, message: str = "Não foi possível realizar a requisição", retry_time: int = 20):
    """Executa uma função de requisição HTTP com retentativas automáticas (retry) e backoff.

    Lida com exceções de conexão e códigos de status HTTP específicos (429 Too Many Requests, 
    503 Service Unavailable), respeitando o header 'Retry-After' quando disponível.

    :param function: Função ou lambda que executa a requisição e retorna um requests.Response.
    :param max_trials: Número máximo de tentativas antes de desistir.
    :param message: Mensagem de log a ser exibida quando ocorrer uma falha.
    :param retry_time: Caso não haja um tempo base fornecido na request, este valor será utilizado para calcular o tempo de espera com base na quantidade de tentativas.
    :return: Objeto requests.Response em caso de sucesso.
    """
    
    trials = 0
    result = None
    while trials < max_trials:
        try:
            result = function()
            if type(result) == requests.Response:
                result.raise_for_status()
            return result
        except requests.HTTPError as e:
            print(message)
            print(f"{e.response.status_code}: {e.response.reason}")
            trials += 1

            if e.response.status_code == 401 or e.response.status_code == 403:
                return result

            if e.response.status_code == 429 or e.response.status_code == 503:
                time_to_wait = int(e.response.headers.get("Retry-After", retry_time * (trials / 2)))
                print(f"Esperando por {time_to_wait} segundos")
                time.sleep(time_to_wait)
        except Exception as e:
            print(message)
            print(e)
            trials += 1
    
    return result