# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# Farmland Analysis Web Service

A web application for analyzing farmland images using satellite data, geospatial processing, and machine learning.

The system allows users to upload field boundary data, visualize it on a map, request satellite-based analysis, and view vegetation and classification results through a web interface.

## Project Stack

Backend:
- Python 3.11+
- FastAPI

Frontend:
- React 18
- Vite
- Mapbox GL JS
- Tailwind CSS

Data Processing:
- Rasterio
- GDAL
- NumPy
- Google Earth Engine API

AI / ML:
- PyTorch
- Torchvision
- ResNet-50
- EuroSAT Dataset

## Features

- Upload GeoJSON field boundaries
- Display fields on interactive map
- Fetch satellite metadata
- Run farmland analysis
- Calculate vegetation indicators (NDVI, etc.)
- Return structured results
- FastAPI Swagger API docs


## Backend Setup

From project root:

```bash
cd farmland-analysis
```
```bash
python3 -m venv backend/venv
```
```bash
source backend/venv/bin/activate
```
```bash
pip install -r requirements.txt
```

Run backend:
```bash
python -m uvicorn backend.main:app --reload --port 8000
```

Backend URL:
http://127.0.0.1:8000

Swagger:
http://127.0.0.1:8000/docs

## Frontend Setup

Open new terminal:
```bash
cd frontend
```
```bash
npm install
```
```bash
npm run dev
```

Frontend URL:
http://localhost:5173

If port busy, use:
http://localhost:5174



## Backend connection with ML 
Place model weights here:

```bash
backend/infrastructure/ml/models/best_resnet_satellite_model.pth
```

This file is not committed to GitHub because it is ignored by .gitignore.

We added .pth to .gitignore because model weight files are usually:
large, binary, bad for normal Git history, can make pushing/pulling slow,

better stored in Google Drive, Kaggle, Hugging Face, or GitHub Releases
