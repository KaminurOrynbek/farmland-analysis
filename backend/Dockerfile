# ==========================================
# STAGE 1: Base image with system dependencies
# ==========================================
FROM python:3.11-slim as base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    gdal-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ==========================================
# STAGE 2: API Image (Lightweight)
# ==========================================
FROM base as api
# We DON'T install torch here. 
# We only copy the code needed for the API.
COPY backend/ ./backend/
COPY alembic/ ./alembic/
COPY alembic.ini ./
COPY gee_service_account.json ./gee_service_account.json

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]

# ==========================================
# STAGE 3: Worker Image (Heavyweight ML)
# ==========================================
FROM base as worker
# Install ML heavy hitters only for the worker
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

COPY backend/ ./backend/
COPY gee_service_account.json ./gee_service_account.json

CMD ["celery", "-A", "backend.infrastructure.celery.celery_app", "worker", "--loglevel=info"]