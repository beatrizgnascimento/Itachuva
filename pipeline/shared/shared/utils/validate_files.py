import io
import earthkit
import glob
import os


def validate_file(grib_file, target_vars):
    """Verifica a validade de um arquivo grib em termos de presença de variáveis e extensão dos dados.
    
        :param grib_file: Caminho para o arquivo grib.
        :target_vars: Variaveis a serem buscadas.

        :return : Variaveis que não foram encontradas ou None se todas forem encontradas
    """
    print("Validando GRIB...")

    stream_grib = io.BytesIO(grib_file)

    gribs = earthkit.data.from_source("stream", stream_grib)

    if gribs is None:
        print("Não foi possível abrir nenhum arquivo GRIB")
        return target_vars or "Todas"
    
    found_vars = set()

    for message in gribs:

        name = message.metadata("shortName", default=None)
        if name:
            found_vars.add(name)

        num_points = message.metadata("numberOfDataPoints", default=0)
        
        if num_points == 0:
            return target_vars or "Todas"
    
    if not target_vars:
        return None

    diff = set(target_vars) - found_vars

    if len(diff) > 0:
        return list(diff)
    
    return None

def verify_tiffs(target_vars, folder):
    """Verifica a validade dos arquivos .tif presentes em um diretório em termos de presença de variáveis e extensão dos dados.
    
        :param folder: Caminho para os arquivos.
        :param target_vars: Variaveis a serem buscadas.
    """
    if not os.path.exists(folder):
        print(f"Pasta {folder} não encontrada para verificação")
        return
    
    tif_files = glob.glob(os.path.join(folder, "**", "*.tif"), recursive=True)
    
    print(f"\nGeotiffs gerados:")
    print(f"Total: {len(tif_files)} arquivos")
    
    by_variable = {}
    for file in tif_files:
        name = os.path.basename(file)
        for var in target_vars:
            if var in name:
                if var not in by_variable:
                    by_variable[var] = []
                by_variable[var].append(file)
                break
    
    for var, files in by_variable.items():
        print(f"\n{var.upper()} - ({len(files)} arquivos):")
        for file in sorted(files):
            size_mb = os.path.getsize(file) / (1024 * 1024)
            print(f"  - {file} ({size_mb:.1f} MB)")
    
    return len(tif_files), by_variable.keys()