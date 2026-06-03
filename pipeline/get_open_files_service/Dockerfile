FROM python:3.10-slim

# Instalar dependências do sistema necessárias pelo eccodes e rasterio
RUN apt-get update && apt-get install -y \
    libeccodes0 \
    libeccodes-data \
    build-essential \
    libproj-dev \
    gdal-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

# Variáveis obrigatórias para o GDAL funcionar
ENV GDAL_DATA=/usr/share/gdal/3.6
ENV PROJ_LIB=/usr/share/proj
ENV PROJ_DATA=/usr/share/proj

# Copiar arquivos do projeto
WORKDIR /app
COPY ./get_open_files_service ./get_open_files_service
COPY ./shared ./shared

# Instalar dependências Python
RUN pip install --no-cache-dir -r ./get_open_files_service/requirements.txt

# Instalar esturura de pastas
RUN pip install ./get_open_files_service && pip install ./shared

# Comando padrão ao rodar o container
CMD ["python", "get_open_files_service/src/main.py"]
