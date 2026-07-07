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

# Copiar arquivos do projeto
WORKDIR /app
COPY ./merge_contents_service ./merge_contents_service
COPY ./shared ./shared

# Instalar dependências Python
RUN pip install --no-cache-dir -r ./merge_contents_service/requirements.txt

# Instalar esturura de pastas
RUN pip install ./merge_contents_service && pip install ./shared

# Comando padrão ao rodar o container
CMD ["python", "merge_contents_service/src/main.py"]
