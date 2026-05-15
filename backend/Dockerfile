FROM python:3.11-slim

# =========================
# SYSTEM DEPENDENCIES
# =========================
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    gdal-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

# Fix GDAL / geospatial libs compatibility
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

# =========================
# PYTHON SETTINGS
# =========================
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# =========================
# WORKDIR
# =========================
WORKDIR /app

# =========================
# DEPENDENCIES INSTALL
# =========================
COPY requirements.txt .

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# =========================
# COPY PROJECT FILES
# =========================
COPY backend/ ./backend/
COPY alembic/ ./alembic/
COPY alembic.ini ./
COPY gee_service_account.json ./gee_service_account.json

# =========================
# PORT
# =========================
EXPOSE 8000

# =========================
# START COMMAND
# =========================
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]