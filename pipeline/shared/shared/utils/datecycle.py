from datetime import datetime
from zoneinfo import ZoneInfo
from shared.config.env import get_env


def get_date():
    """Retorna a data atual ou a data definida no .env
    
        :return: Data atual se a variavel de ambiente `ENVIRONMENT` for definida como 'production' e
        a data definida no .env caso contrário.
    """
    if get_env()['ENVIRONMENT'] == 'production':
        return datetime.now(ZoneInfo("America/Sao_Paulo")).strftime('%Y%m%d')
    else:
        return get_env()['DOWNLOAD_DATE']

def get_cycle():
    """Retorna o ciclo atual ou o ciclo definido no .env
    
        :return: Ciclo atual se a variavel de ambiente `ENVIRONMENT` for definida como 'production' e
        o ciclo definido no .env caso contrário.
    """
    if get_env()['ENVIRONMENT'] == 'production':
        return '00' if datetime.now().hour < 10 else '06' if datetime.now().hour < 16 else '12' if datetime.now().hour < 22 else '18'
    else:
        return get_env()['DOWNLOAD_CYCLE']