import json
import os
import tempfile
import zipfile
from pathlib import Path

import geopandas as gpd
from fastapi import UploadFile

SUPPORTED_EXTENSIONS = (".zip", ".kml", ".geojson", ".json")


async def process_upload(file: UploadFile) -> dict:

    filename = file.filename or "unknown"
    file_ext = Path(filename).suffix.lower()
    file_stem = Path(filename).stem

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = os.path.join(tmpdir, Path(filename).name)
        content = await file.read()
        with open(tmp_path, "wb") as f:
            f.write(content)

        if file_ext == ".zip":
            return _process_zip(tmp_path, tmpdir)
        elif file_ext == ".kml":
            return _process_kml(tmp_path, file_stem)
        elif file_ext in (".geojson", ".json"):
            return _process_geojson(tmp_path, file_stem)
        else:
            raise ValueError(f"Formato no soportado: {file_ext}")


def _to_result(gdf: gpd.GeoDataFrame, nombre: str, tipo: str) -> dict:
    if gdf.empty:
        raise ValueError("El archivo no contiene geometrías")

    if gdf.crs is None:
        gdf = gdf.set_crs(epsg=4326)
    elif gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)

    gdf = gdf[gdf.geometry.notna() & ~gdf.geometry.is_empty]
    if gdf.empty:
        raise ValueError("El archivo no contiene geometrías válidas")

    minx, miny, maxx, maxy = (float(v) for v in gdf.total_bounds)

    return {
        "geojson": json.loads(gdf.to_json()),
        "nombre": nombre,
        "tipo": tipo,
        "bounds": [minx, miny, maxx, maxy],
    }


def _process_zip(zip_path: str, tmpdir: str) -> dict:
    extract_dir = os.path.join(tmpdir, "extracted")
    os.makedirs(extract_dir, exist_ok=True)

    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            for member in zf.namelist():
                target = os.path.realpath(os.path.join(extract_dir, member))
                if not target.startswith(os.path.realpath(extract_dir) + os.sep):
                    raise ValueError("El ZIP contiene rutas no permitidas")
            zf.extractall(extract_dir)
    except zipfile.BadZipFile:
        raise ValueError("El archivo ZIP está corrupto o no es válido")

    shp_files = list(Path(extract_dir).rglob("*.shp"))
    if not shp_files:
        raise ValueError("No se encontró ningún archivo .shp dentro del ZIP")

    shp_path = shp_files[0]
    for required in (".dbf", ".shx"):
        if not shp_path.with_suffix(required).exists():
            raise ValueError(f"Falta el archivo {required} junto al .shp")

    gdf = gpd.read_file(str(shp_path))
    return _to_result(gdf, shp_path.stem, "shp")


def _process_kml(kml_path: str, original_name: str) -> dict:
    gdf = gpd.read_file(kml_path, driver="KML")
    return _to_result(gdf, original_name, "kml")


def _process_geojson(path: str, original_name: str) -> dict:
    try:
        gdf = gpd.read_file(path)
    except Exception:
        raise ValueError("El archivo GeoJSON no es válido")
    return _to_result(gdf, original_name, "geojson")


def export_layer(geojson: dict, nombre: str, formato: str, tmpdir: str) -> tuple[str, str]:
    """Writes a stored layer to disk. Returns (path, media type)."""
    gdf = gpd.GeoDataFrame.from_features(geojson.get("features", []), crs="EPSG:4326")
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in nombre) or "capa"

    if formato == "geojson":
        path = os.path.join(tmpdir, f"{safe}.geojson")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(geojson, f, ensure_ascii=False)
        return path, "application/geo+json"

    if formato == "kml":
        path = os.path.join(tmpdir, f"{safe}.kml")
        gdf.to_file(path, driver="KML")
        return path, "application/vnd.google-earth.kml+xml"

    if formato == "shp":
        shp_dir = os.path.join(tmpdir, safe)
        os.makedirs(shp_dir, exist_ok=True)
        gdf.to_file(os.path.join(shp_dir, f"{safe}.shp"), driver="ESRI Shapefile")
        path = os.path.join(tmpdir, f"{safe}.zip")
        with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
            for p in Path(shp_dir).iterdir():
                zf.write(p, p.name)
        return path, "application/zip"

    raise ValueError(f"Formato de descarga no soportado: {formato}")
