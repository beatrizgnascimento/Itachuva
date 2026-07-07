FROM python:3.10-slim

RUN apt-get update && apt-get install -y \
    libeccodes0 \
    libeccodes-data \
    build-essential \
    libproj-dev \
    gdal-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

ENV GDAL_DATA=/usr/share/gdal/3.6
ENV PROJ_LIB=/usr/share/proj
ENV PROJ_DATA=/usr/share/proj

WORKDIR /app

COPY ./setup_files_service/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir "numpy<2,>=1.24"
RUN pip install --no-cache-dir --no-build-isolation GDAL==3.6.4

RUN pip install --no-cache-dir -r requirements.txt

COPY ./setup_files_service ./setup_files_service
COPY ./shared ./shared

RUN pip install ./setup_files_service && pip install ./shared

CMD ["python", "setup_files_service/src/main.py"]