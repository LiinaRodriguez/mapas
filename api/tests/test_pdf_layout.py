import base64
import io

import pytest
from PIL import Image
from pypdf import PdfReader

from api.schemas.exportar import LegendClass, LegendItem, PDFExportPayload
from api.services.pdf_layout import (
    build_pdf,
    compute_layout,
    format_dms,
    frame_pixels,
    numeric_scale,
)

BBOX = [-73.45, 3.85, -73.25, 4.05]


def _image(w=400, h=300):
    buf = io.BytesIO()
    Image.new("RGB", (w, h), (40, 120, 60)).save(buf, "JPEG")
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def _payload(**kw):
    data = dict(
        title="Mapa de Lotes y Cobertura",
        subtitle="Finca La Esperanza",
        notes="Levantamiento GPS de octubre.",
        author="Lina",
        paperSize="A4",
        orientation="landscape",
        dpi=150,
        bbox=BBOX,
        legend=[
            LegendItem(label="Lotes de Palma", fillColor="#2E7D32", strokeColor="#1B5E20"),
            LegendItem(
                label="Cobertura",
                classes=[LegendClass(label="Bosque", color="#14532d"), LegendClass(label="Pasto", color="#a3e635")],
            ),
            LegendItem(label="Vías", geometryType="line"),
            LegendItem(label="Pozos", geometryType="point"),
        ],
        mapImage=_image(),
    )
    data.update(kw)
    return PDFExportPayload(**data)


@pytest.mark.parametrize("paper", ["Carta", "A4", "A3"])
@pytest.mark.parametrize("orientation", ["landscape", "portrait"])
def test_layout_fits_page(paper, orientation):
    layout = compute_layout(paper, orientation)
    f, pnl = layout.frame, layout.panel
    assert f.w > 100 and f.h > 100
    assert f.x + f.w <= layout.page_w and f.y + f.h <= layout.page_h
    assert pnl.x + pnl.w <= layout.page_w and pnl.y >= 0
    if orientation == "landscape":
        assert layout.page_w > layout.page_h


def test_frame_pixels_follow_dpi():
    _, _, w150, h150 = frame_pixels("A4", "landscape", 150)
    _, _, w300, h300 = frame_pixels("A4", "landscape", 300)
    assert w300 == pytest.approx(w150 * 2, abs=2)
    assert h300 == pytest.approx(h150 * 2, abs=2)


def test_numeric_scale_is_rounded():
    scale = numeric_scale(BBOX, 200)
    # 0.2° of longitude at ~4°N is ~22.2 km over 200 mm => ~1:111.000
    assert 105_000 < scale < 115_000
    assert scale % 1000 == 0


def test_dms():
    assert format_dms(-73.5, False) == "73°30'00.0\"W"
    assert format_dms(4.0, True) == "4°00'00.0\"N"


@pytest.mark.parametrize("grid", ["EPSG:4326", "EPSG:9377", "EPSG:3116"])
@pytest.mark.parametrize("paper,orientation", [("A4", "landscape"), ("Carta", "portrait"), ("A3", "landscape")])
def test_build_pdf(grid, paper, orientation):
    pdf = build_pdf(_payload(gridCrs=grid, paperSize=paper, orientation=orientation))
    reader = PdfReader(io.BytesIO(pdf))
    assert len(reader.pages) == 1
    page = reader.pages[0]
    text = page.extract_text()
    assert "MAPA DE LOTES Y COBERTURA" in text
    assert "LEYENDA" in text and "Escala 1:" in text
    vp = page["/VP"][0]
    assert vp["/Measure"]["/Subtype"] == "/GEO"


def test_standard_pdf_has_no_viewport():
    pdf = build_pdf(_payload(georeferenced=False, includeGrid=False, includeLegend=False))
    page = PdfReader(io.BytesIO(pdf)).pages[0]
    assert "/VP" not in page


def test_invalid_bbox_rejected():
    with pytest.raises(ValueError):
        _payload(bbox=[-73.2, 3.8, -73.5, 4.1])
