import json
import os
import tempfile
import zipfile
from pathlib import Path

import geopandas as gpd
from fastapi import UploadFile


async def process_upload(file: UploadFile) -> dict:

    filename = file.filename or "unknown"
    file_ext = Path(filename).suffix.lower()
    file_stem = Path(filename).stem

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = os.path.join(tmpdir, filename)
        content = await file.read()
        with open(tmp_path, "wb") as f:
            f.write(content)

        if file_ext == ".zip":
            return _process_zip(tmp_path, tmpdir, file_stem)
        elif file_ext == ".kml":
            return _process_kml(tmp_path, file_stem)
        else:
            raise ValueError(f"Formato no soportado: {file_ext}")


def _process_zip(zip_path: str, tmpdir: str, original_name: str) -> dict:
    extract_dir = os.path.join(tmpdir, "extracted")
    os.makedirs(extract_dir, exist_ok=True)

    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(extract_dir)
    except zipfile.BadZipFile:
        raise ValueError("El archivo ZIP está corrupto o no es válido")

    shp_files = list(Path(extract_dir).rglob("*.shp"))
    if not shp_files:
        raise ValueError("No se encontró ningún archivo .shp dentro del ZIP")

    shp_path = str(shp_files[0])
    shp_name = Path(shp_path).stem

    gdf = gpd.read_file(shp_path)

    if gdf.crs and gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)

    geojson_str = gdf.to_json()
    geojson_dict = json.loads(geojson_str)

    return {
        "geojson": geojson_dict,
        "nombre": shp_name,
        "tipo": "shp",
    }


def _process_kml(kml_path: str, original_name: str) -> dict:
    gpd.io.file.fiona.drvsupport.supported_drivers["KML"] = "r"

    gdf = gpd.read_file(kml_path, driver="KML")
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)

    geojson_str = gdf.to_json()
    geojson_dict = json.loads(geojson_str)

    return {
        "geojson": geojson_dict,
        "nombre": original_name,
        "tipo": "kml",
    }
