import glob
import time
import os
import xarray as xr
import numpy as np

class ProcessingLogger:
    """Logger destinado a imprimir informações relevantes dos processamentos definidos para o pipeline."""
    def __init__(self, descriptions: dict | None = None):
        """
        :param descriptions: Dicionário opcional {nome_variavel: "Descrição legível"}
        """
        self.__descriptions = descriptions or {}
        
        # Estado Global (Batch)
        self.__batch_start_time = 0.0
        self.__success_count = 0
        self.__total_files = 0
        
        # Estado Local (Arquivo atual)
        self.__file_start_time = 0.0
        self.__generated_files_in_current_step = 0

    def start_batch(self, total_files: int):
        """Inicia o cronômetro global e imprime o cabeçalho inicial do log.

            :param total_files: Número total de arquivos a serem processados.
        """
        self.__total_files = total_files
        self.__success_count = 0
        self.__batch_start_time = time.time()
        
        print(f"\nIniciando processamento de {total_files} arquivos")
        print("=" * 60)

    def start_file(self, filename: str, index: int):
        """Marca o início de um novo arquivo.
        
            :param filename: Nome do arquivo sendo processado atualmente.
            :param index: Indice que indica a sequência de processamento do arquivo: primeiro, sengundo, terceiro, etc.
        """
        self.__file_start_time = time.time()
        self.__generated_files_in_current_step = 0
        
        print(f"\n--- Arquivo {index}/{self.__total_files} ---")
        print(f"Convertendo: {filename}")
        print("-" * 60)

    def log_variable(self, data: xr.DataArray):
        """
        Loga os detalhes de uma variável processada.
        
        :param data: O DataArray do xarray/rioxarray
        """
        var_name = data.name
        description = self.__descriptions.get(var_name, "Sem descrição")
        
        size_mb = data.nbytes / (1024 * 1024)

        try:
            min_val = f"{data.min().values:.2f}"
            max_val = f"{data.max().values:.2f}"
            units = data.attrs.get('units', 'N/A')
        except Exception:
            min_val, max_val, units = "?", "?", "?"

        print(f"\nConvertendo {var_name} ({description})...")
        print(f" -> Stats: Min: {min_val} | Max: {max_val} | Unid: {units}")
        print(f" -> Tamanho: {size_mb:.1f} MB")
        
        self.__generated_files_in_current_step += 1

    def end_file(self, success: bool = True):
        """Finaliza o log do arquivo atual.

            :param success: Indica se o arquivo foi processado com sucesso ou não.
        """
        duration = time.time() - self.__file_start_time
        
        if success:
            self.__success_count += 1
            print(f"\nArquivo concluído em {duration:.2f}s.")
            print(f"Variáveis geradas: {self.__generated_files_in_current_step}")
        else:
            print(f"\nFALHA no processamento do arquivo após {duration:.2f}s.")
        
        print("=" * 60)
        return duration

    def end_batch(self):
        """Finaliza o log total."""
        total_duration = time.time() - self.__batch_start_time
        
        print(f"\nPROCESSAMENTO FINALIZADO")
        print("=" * 60)
        print(f"Arquivos processados com sucesso: {self.__success_count}/{self.__total_files}")
        print(f"Tempo total decorrido: {total_duration:.2f} segundos")