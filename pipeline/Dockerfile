FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY src ./src

RUN mkdir -p /app/data/raw /app/data/processed /app/data/output

CMD ["python", "-m", "src.run_pipeline"]
