import io
import json
import zipfile

import geopandas as gpd
import pytest
from shapely.geometry import Point, Polygon

from api.services.geo_processor import _process_geojson, _process_zip, export_layer


def _gdf(crs="EPSG:4326"):
    gdf = gpd.GeoDataFrame(
        {"nombre": ["Lote 1", "Lote 2"], "area_ha": [12.5, 3.2]},
        geometry=[
            Polygon([(-73.5, 3.8), (-73.4, 3.8), (-73.4, 3.9), (-73.5, 3.9)]),
            Polygon([(-73.3, 4.0), (-73.2, 4.0), (-73.2, 4.1), (-73.3, 4.1)]),
        ],
        crs="EPSG:4326",
    )
    return gdf.to_crs(crs)


def test_geojson_upload_returns_bounds(tmp_path):
    path = tmp_path / "lotes.geojson"
    path.write_text(_gdf().to_json())
    result = _process_geojson(str(path), "lotes")
    assert result["tipo"] == "geojson"
    assert len(result["geojson"]["features"]) == 2
    assert result["bounds"] == pytest.approx([-73.5, 3.8, -73.2, 4.1])


def test_invalid_geojson_raises(tmp_path):
    path = tmp_path / "malo.geojson"
    path.write_text("{not json")
    with pytest.raises(ValueError):
        _process_geojson(str(path), "malo")


def test_shapefile_zip_is_reprojected_to_wgs84(tmp_path):
    shp_dir = tmp_path / "shp"
    shp_dir.mkdir()
    _gdf("EPSG:9377").to_file(shp_dir / "lotes.shp")
    zip_path = tmp_path / "lotes.zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        for p in shp_dir.iterdir():
            zf.write(p, p.name)

    result = _process_zip(str(zip_path), str(tmp_path))
    assert result["nombre"] == "lotes"
    assert result["bounds"] == pytest.approx([-73.5, 3.8, -73.2, 4.1], abs=1e-6)


def test_zip_without_dbf_is_rejected(tmp_path):
    zip_path = tmp_path / "incompleto.zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr("lotes.shp", b"")
    with pytest.raises(ValueError, match=".dbf"):
        _process_zip(str(zip_path), str(tmp_path))


def test_zip_slip_is_rejected(tmp_path):
    zip_path = tmp_path / "malicioso.zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr("../fuera.shp", b"")
    with pytest.raises(ValueError, match="rutas"):
        _process_zip(str(zip_path), str(tmp_path))


@pytest.mark.parametrize("formato", ["geojson", "kml", "shp"])
def test_export_layer(tmp_path, formato):
    geojson = json.loads(_gdf().to_json())
    path, _ = export_layer(geojson, "Lotes de Palma", formato, str(tmp_path))
    if formato == "shp":
        with zipfile.ZipFile(path) as zf:
            names = zf.namelist()
        assert {"Lotes_de_Palma.shp", "Lotes_de_Palma.dbf", "Lotes_de_Palma.shx"} <= set(names)
    else:
        assert len(gpd.read_file(path)) == 2
