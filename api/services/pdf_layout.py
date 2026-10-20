"""Cartographic PDF layout: map frame, grid, north arrow, scale, legend and metadata."""

import base64
import io
import math
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Tuple

from pyproj import CRS, Geod, Transformer
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    ArrayObject,
    DictionaryObject,
    FloatObject,
    NameObject,
    NumberObject,
    TextStringObject,
)
from reportlab.lib.colors import Color, HexColor, black, white
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.pdfgen import canvas as rl_canvas

from api.schemas.exportar import LegendItem, PDFExportPayload

PAPER_SIZES_MM = {
    "Carta": (215.9, 279.4),
    "A4": (210.0, 297.0),
    "A3": (297.0, 420.0),
}

CRS_LABELS = {
    "EPSG:4326": "WGS 84 (EPSG:4326)",
    "EPSG:9377": "MAGNA-SIRGAS / Origen Nacional CTM12 (EPSG:9377)",
    "EPSG:3116": "MAGNA-SIRGAS / Colombia Bogotá (EPSG:3116)",
}

MARGIN = 10.0
HEADER_H = 18.0
GAP = 4.0
GUTTER = 7.0  # space around the map frame for grid labels
PANEL_W = 72.0  # landscape: side panel
PANEL_H = 64.0  # portrait: bottom panel

INK = HexColor("#1e293b")
MUTED = HexColor("#64748b")
RULE = HexColor("#cbd5e1")

_geod = Geod(ellps="WGS84")


@dataclass
class Box:
    x: float
    y: float
    w: float
    h: float


@dataclass
class Layout:
    page_w: float
    page_h: float
    header: Box
    frame: Box
    panel: Box
    landscape: bool


def page_size(paper: str, orientation: str) -> Tuple[float, float]:
    w, h = PAPER_SIZES_MM[paper]
    return (max(w, h), min(w, h)) if orientation == "landscape" else (min(w, h), max(w, h))


def compute_layout(paper: str, orientation: str) -> Layout:
    pw, ph = page_size(paper, orientation)
    header = Box(MARGIN, ph - MARGIN - HEADER_H, pw - 2 * MARGIN, HEADER_H)
    body_top = header.y - GAP

    if orientation == "landscape":
        panel = Box(pw - MARGIN - PANEL_W, MARGIN, PANEL_W, body_top - MARGIN)
        frame = Box(
            MARGIN + GUTTER,
            MARGIN + GUTTER,
            panel.x - GAP - MARGIN - 2 * GUTTER,
            body_top - MARGIN - 2 * GUTTER,
        )
    else:
        panel = Box(MARGIN, MARGIN, pw - 2 * MARGIN, PANEL_H)
        bottom = panel.y + panel.h + GAP
        frame = Box(
            MARGIN + GUTTER,
            bottom + GUTTER,
            pw - 2 * MARGIN - 2 * GUTTER,
            body_top - bottom - 2 * GUTTER,
        )

    return Layout(pw, ph, header, frame, panel, orientation == "landscape")


def frame_pixels(paper: str, orientation: str, dpi: int) -> Tuple[float, float, int, int]:
    frame = compute_layout(paper, orientation).frame
    return frame.w, frame.h, round(frame.w / 25.4 * dpi), round(frame.h / 25.4 * dpi)


# --- Geometry helpers -------------------------------------------------------

def _merc_y(lat: float) -> float:
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


class FrameProjector:
    """Maps WGS84 lon/lat to mm inside the map frame (Web Mercator image)."""

    def __init__(self, bbox: List[float], frame: Box):
        self.west, self.south, self.east, self.north = bbox
        self.frame = frame
        self.ys = _merc_y(self.south)
        self.yn = _merc_y(self.north)

    def __call__(self, lon: float, lat: float) -> Tuple[float, float]:
        fx = (lon - self.west) / (self.east - self.west)
        fy = (_merc_y(lat) - self.ys) / (self.yn - self.ys)
        return self.frame.x + fx * self.frame.w, self.frame.y + fy * self.frame.h


def ground_width_m(bbox: List[float]) -> float:
    west, south, east, north = bbox
    lat = (south + north) / 2
    _, _, dist = _geod.inv(west, lat, east, lat)
    return dist


def numeric_scale(bbox: List[float], frame_w_mm: float) -> int:
    raw = ground_width_m(bbox) / (frame_w_mm / 1000)
    digits = int(math.floor(math.log10(raw))) - 2  # keep 3 significant digits
    step = 10 ** max(digits, 0)
    return int(round(raw / step) * step)


def format_thousands(n: float) -> str:
    return f"{int(round(n)):,}".replace(",", ".")


def nice_step(span: float, target_lines: int = 5) -> float:
    raw = span / target_lines
    exp = math.floor(math.log10(raw))
    for m in (1, 2, 2.5, 5, 10):
        step = m * 10 ** exp
        if step >= raw:
            return step
    return 10 ** (exp + 1)


def format_dms(value: float, is_lat: bool) -> str:
    hemi = ("N" if value >= 0 else "S") if is_lat else ("E" if value >= 0 else "W")
    v = abs(value)
    d = int(v)
    m_float = (v - d) * 60
    m = int(m_float)
    s = (m_float - m) * 60
    if s >= 59.95:
        s = 0
        m += 1
    if m == 60:
        m = 0
        d += 1
    return f"{d}°{m:02d}'{s:04.1f}\"{hemi}"


# --- Drawing ----------------------------------------------------------------

def _hex(color: str, alpha: float = 1.0) -> Color:
    try:
        c = HexColor(color)
    except Exception:
        c = HexColor("#3b82f6")
    return Color(c.red, c.green, c.blue, alpha=alpha)


def _text(c, x, y, s, size=8, bold=False, color=INK, anchor="left"):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    if anchor == "center":
        c.drawCentredString(x * mm, y * mm, s)
    elif anchor == "right":
        c.drawRightString(x * mm, y * mm, s)
    else:
        c.drawString(x * mm, y * mm, s)


def _box(c, b: Box, fill=None, stroke=INK, width=0.4):
    c.setLineWidth(width)
    c.setStrokeColor(stroke)
    if fill is not None:
        c.setFillColor(fill)
    c.rect(b.x * mm, b.y * mm, b.w * mm, b.h * mm, stroke=1, fill=1 if fill is not None else 0)


def _decode_image(data_url: str) -> ImageReader:
    if "," in data_url:
        data_url = data_url.split(",", 1)[1]
    try:
        raw = base64.b64decode(data_url, validate=False)
    except Exception:
        raise ValueError("La imagen del mapa no es válida")
    if not raw:
        raise ValueError("La imagen del mapa está vacía")
    return ImageReader(io.BytesIO(raw))


def _draw_header(c, layout: Layout, p: PDFExportPayload):
    h = layout.header
    _box(c, h, fill=INK, stroke=INK)
    title = p.title.upper()
    size = 15
    while size > 9 and c.stringWidth(title, "Helvetica-Bold", size) > (h.w - 12) * mm:
        size -= 1
    _text(c, h.x + 6, h.y + h.h - 8.5, title, size=size, bold=True, color=white)
    if p.subtitle:
        sub = simpleSplit(p.subtitle, "Helvetica", 8.5, (h.w - 12) * mm)[0]
        _text(c, h.x + 6, h.y + 3.8, sub, size=8.5, color=HexColor("#cbd5e1"))


def _grid_lines(p: PDFExportPayload, proj: FrameProjector) -> List[Tuple[str, str, List[Tuple[float, float]]]]:
    """Returns (axis, label, polyline in mm). axis is 'x' for meridian-like lines."""
    west, south, east, north = p.bbox
    lines = []
    samples = 24

    if p.gridCrs == "EPSG:4326":
        step = nice_step(min(east - west, north - south))
        lon = math.ceil(west / step) * step
        while lon < east:
            pts = [proj(lon, south + (north - south) * i / samples) for i in range(samples + 1)]
            lines.append(("x", format_dms(lon, False), pts))
            lon += step
        lat = math.ceil(south / step) * step
        while lat < north:
            pts = [proj(west + (east - west) * i / samples, lat) for i in range(samples + 1)]
            lines.append(("y", format_dms(lat, True), pts))
            lat += step
        return lines

    to_proj = Transformer.from_crs("EPSG:4326", p.gridCrs, always_xy=True)
    to_geo = Transformer.from_crs(p.gridCrs, "EPSG:4326", always_xy=True)
    corners = [to_proj.transform(x, y) for x, y in ((west, south), (west, north), (east, south), (east, north))]
    xs = [c[0] for c in corners]
    ys = [c[1] for c in corners]
    xmin, xmax, ymin, ymax = min(xs), max(xs), min(ys), max(ys)
    step = nice_step(min(xmax - xmin, ymax - ymin))

    e = math.ceil(xmin / step) * step
    while e < xmax:
        pts = [proj(*to_geo.transform(e, ymin + (ymax - ymin) * i / samples)) for i in range(samples + 1)]
        lines.append(("x", f"{format_thousands(e)} E", pts))
        e += step
    n = math.ceil(ymin / step) * step
    while n < ymax:
        pts = [proj(*to_geo.transform(xmin + (xmax - xmin) * i / samples, n)) for i in range(samples + 1)]
        lines.append(("y", f"{format_thousands(n)} N", pts))
        n += step
    return lines


def _edge_crossing(pts, coord: int, value: float) -> Optional[Tuple[float, float]]:
    for a, b in zip(pts, pts[1:]):
        if (a[coord] - value) * (b[coord] - value) <= 0 and a[coord] != b[coord]:
            t = (value - a[coord]) / (b[coord] - a[coord])
            return a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])
    return None


def _draw_grid(c, layout: Layout, p: PDFExportPayload, proj: FrameProjector):
    f = layout.frame
    lines = _grid_lines(p, proj)

    c.saveState()
    clip = c.beginPath()
    clip.rect(f.x * mm, f.y * mm, f.w * mm, f.h * mm)
    c.clipPath(clip, stroke=0, fill=0)
    # A dark solid line under a light dashed one keeps the grid readable on any basemap.
    for width, color, dash in ((0.6, Color(0.1, 0.1, 0.1, alpha=0.45), None), (0.35, Color(1, 1, 1, alpha=0.85), (2, 2))):
        c.setLineWidth(width)
        c.setStrokeColor(color)
        if dash:
            c.setDash(*dash)
        for _, _, pts in lines:
            path = c.beginPath()
            path.moveTo(pts[0][0] * mm, pts[0][1] * mm)
            for x, y in pts[1:]:
                path.lineTo(x * mm, y * mm)
            c.drawPath(path, stroke=1, fill=0)
    c.restoreState()

    c.setLineWidth(0.3)
    c.setStrokeColor(INK)
    for axis, label, pts in lines:
        if axis == "x":
            for edge, dy, tick in ((f.y, -4.2, -1.5), (f.y + f.h, 1.8, 1.5)):
                hit = _edge_crossing(pts, 1, edge)
                if hit and f.x + 4 < hit[0] < f.x + f.w - 4:
                    c.line(hit[0] * mm, edge * mm, hit[0] * mm, (edge + tick) * mm)
                    _text(c, hit[0], edge + dy, label, size=5.5, color=INK, anchor="center")
        else:
            for edge, side in ((f.x, -1), (f.x + f.w, 1)):
                hit = _edge_crossing(pts, 0, edge)
                if hit and f.y + 4 < hit[1] < f.y + f.h - 4:
                    c.line(edge * mm, hit[1] * mm, (edge + 1.5 * side) * mm, hit[1] * mm)
                    c.saveState()
                    # Rotated glyphs extend towards -x from their baseline.
                    c.translate((edge - 1.8 if side < 0 else edge + 3.8) * mm, hit[1] * mm)
                    c.rotate(90)
                    _text(c, 0, 0, label, size=5.5, color=INK, anchor="center")
                    c.restoreState()


def _draw_north_arrow(c, cx: float, cy: float, size: float):
    half = size / 2
    c.setLineWidth(0.4)
    c.setStrokeColor(INK)
    left = c.beginPath()
    left.moveTo(cx * mm, (cy + half) * mm)
    left.lineTo((cx - size * 0.28) * mm, (cy - half) * mm)
    left.lineTo(cx * mm, (cy - half * 0.45) * mm)
    left.close()
    c.setFillColor(INK)
    c.drawPath(left, stroke=1, fill=1)
    right = c.beginPath()
    right.moveTo(cx * mm, (cy + half) * mm)
    right.lineTo((cx + size * 0.28) * mm, (cy - half) * mm)
    right.lineTo(cx * mm, (cy - half * 0.45) * mm)
    right.close()
    c.setFillColor(white)
    c.drawPath(right, stroke=1, fill=1)
    _text(c, cx, cy + half + 1.5, "N", size=9, bold=True, anchor="center")


def _draw_scale(c, x: float, y: float, max_w: float, scale: int):
    m_per_mm = scale / 1000
    ground = max_w * m_per_mm
    exp = math.floor(math.log10(ground))
    length = 10 ** exp
    for mult in (5, 4, 3, 2.5, 2, 1):
        if mult * 10 ** exp <= ground:
            length = mult * 10 ** exp
            break
    bar_w = length / m_per_mm
    segments = 4
    seg_w = bar_w / segments
    c.setLineWidth(0.3)
    c.setStrokeColor(INK)
    for i in range(segments):
        c.setFillColor(INK if i % 2 == 0 else white)
        c.rect((x + i * seg_w) * mm, y * mm, seg_w * mm, 1.8 * mm, stroke=1, fill=1)

    use_km = length >= 1000
    unit = "km" if use_km else "m"

    def fmt(v: float) -> str:
        v = v / 1000 if use_km else v
        return f"{v:g}".replace(".", ",")

    for frac in (0, 0.5, 1):
        _text(c, x + bar_w * frac, y - 3, fmt(length * frac), size=6, anchor="center")
    _text(c, x + bar_w + 3, y + 0.2, unit, size=6)
    _text(c, x, y + 4, f"Escala 1:{format_thousands(scale)}", size=8, bold=True)


def _draw_legend_symbol(c, item: LegendItem, x: float, y: float, fill: Optional[str] = None):
    fill_color = fill or item.fillColor
    stroke_color = fill or item.strokeColor
    c.setLineWidth(min(max(item.strokeWidth, 0.5), 3) * 0.35)
    c.setStrokeColor(_hex(stroke_color))
    if item.geometryType == "line":
        c.line(x * mm, (y + 1.5) * mm, (x + 6) * mm, (y + 1.5) * mm)
    elif item.geometryType == "point":
        c.setFillColor(_hex(fill_color))
        c.circle((x + 3) * mm, (y + 1.5) * mm, 1.4 * mm, stroke=1, fill=1)
    else:
        c.setFillColor(_hex(fill_color, max(item.fillOpacity, 0.35)))
        c.rect(x * mm, y * mm, 6 * mm, 3.2 * mm, stroke=1, fill=1)


def _draw_legend(c, b: Box, items: List[LegendItem]):
    _box(c, b, fill=white, stroke=INK)
    _text(c, b.x + 4, b.y + b.h - 6, "LEYENDA", size=9, bold=True)
    c.setStrokeColor(RULE)
    c.line((b.x + 4) * mm, (b.y + b.h - 8) * mm, (b.x + b.w - 4) * mm, (b.y + b.h - 8) * mm)

    y = b.y + b.h - 13
    max_label = (b.w - 16) * mm
    for item in items:
        rows = [(item.label, None, 0)] + [(cls.label, cls.color, 4) for cls in item.classes]
        for label, color, indent in rows:
            if y < b.y + 3:
                _text(c, b.x + 4, b.y + 2, "…", size=8)
                return
            is_group = indent == 0 and bool(item.classes)
            if not is_group:
                _draw_legend_symbol(c, item, b.x + 4 + indent, y, color)
            text = simpleSplit(label, "Helvetica", 7, max_label - indent * mm)[:1] or [""]
            _text(c, b.x + (4 if is_group else 12 + indent), y + 0.6, text[0], size=7, bold=is_group)
            y -= 5


def _draw_metadata(c, b: Box, p: PDFExportPayload, scale: int):
    _box(c, b, fill=white, stroke=INK)
    _text(c, b.x + 4, b.y + b.h - 6, "CONVENCIONES Y METADATOS", size=8, bold=True)
    c.setStrokeColor(RULE)
    c.line((b.x + 4) * mm, (b.y + b.h - 8) * mm, (b.x + b.w - 4) * mm, (b.y + b.h - 8) * mm)

    rows = [
        ("Fecha", datetime.now().strftime("%d/%m/%Y")),
        ("Elaborado por", p.author or "—"),
        ("Tarjeta profesional", p.license or "No registra"),
        ("Sistema de referencia", CRS_LABELS["EPSG:4326"]),
        ("Grilla", CRS_LABELS[p.gridCrs] if p.includeGrid else "Sin grilla"),
        ("Escala", f"1:{format_thousands(scale)} (papel {p.paperSize})"),
    ]
    width = (b.w - 8) * mm
    y = b.y + b.h - 12
    for label, value in rows:
        _text(c, b.x + 4, y, f"{label}:", size=6.5, bold=True, color=MUTED)
        lines = simpleSplit(value, "Helvetica", 6.5, width - 26 * mm)[:2]
        for i, line in enumerate(lines):
            _text(c, b.x + 30, y - i * 3, line, size=6.5)
        y -= 3.6 + 3 * (len(lines) - 1)

    if p.notes and y > b.y + 6:
        _text(c, b.x + 4, y, "Notas:", size=6.5, bold=True, color=MUTED)
        y -= 3
        for line in simpleSplit(p.notes, "Helvetica", 6.5, width):
            if y < b.y + 2.5:
                break
            _text(c, b.x + 4, y, line, size=6.5)
            y -= 3


def _draw_panel(c, layout: Layout, p: PDFExportPayload, scale: int):
    pnl = layout.panel
    tools_h = 28 if (p.includeNorthArrow or p.includeScale) else 0
    meta_h = 60

    if layout.landscape:
        tools = Box(pnl.x, pnl.y + pnl.h - tools_h, pnl.w, tools_h)
        meta = Box(pnl.x, pnl.y, pnl.w, meta_h)
        legend = Box(pnl.x, meta.y + meta.h + GAP, pnl.w, pnl.h - meta_h - tools_h - GAP * (2 if tools_h else 1))
    else:
        col = (pnl.w - 2 * GAP) / 3
        tools = Box(pnl.x, pnl.y, col, pnl.h) if tools_h else Box(pnl.x, pnl.y, 0, 0)
        legend_x = pnl.x + (col + GAP if tools_h else 0)
        legend_w = col if tools_h else col * 2 + GAP
        legend = Box(legend_x, pnl.y, legend_w, pnl.h)
        meta = Box(pnl.x + pnl.w - col, pnl.y, col, pnl.h)

    if tools_h:
        _box(c, tools, fill=white, stroke=INK)
        if p.includeNorthArrow:
            _draw_north_arrow(c, tools.x + 10, tools.y + tools.h - 14, 13)
        if p.includeScale:
            sx = tools.x + (22 if p.includeNorthArrow else 5)
            _draw_scale(c, sx, tools.y + tools.h - 17, tools.x + tools.w - sx - 9, scale)

    if p.includeLegend:
        _draw_legend(c, legend, p.legend)
    else:
        _box(c, legend, fill=white, stroke=INK)
    _draw_metadata(c, meta, p, scale)


def _georeference(pdf_bytes: bytes, frame: Box, bbox: List[float]) -> bytes:
    """Adds an ISO 32000 geospatial viewport (/VP + /Measure /GEO) over the map frame."""
    west, south, east, north = bbox
    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    writer.append(reader)
    page = writer.pages[0]

    wkt = CRS.from_epsg(3857).to_wkt(version="WKT1_GDAL")
    gcs = DictionaryObject({
        NameObject("/Type"): NameObject("/PROJCS"),
        NameObject("/EPSG"): NumberObject(3857),
        NameObject("/WKT"): TextStringObject(wkt),
    })
    unit_square = [0, 0, 0, 1, 1, 1, 1, 0]
    # GPTS are lat/lon pairs for the corners in LPTS order: LL, UL, UR, LR.
    gpts = [south, west, north, west, north, east, south, east]
    measure = DictionaryObject({
        NameObject("/Type"): NameObject("/Measure"),
        NameObject("/Subtype"): NameObject("/GEO"),
        NameObject("/Bounds"): ArrayObject([NumberObject(v) for v in unit_square]),
        NameObject("/GPTS"): ArrayObject([FloatObject(v) for v in gpts]),
        NameObject("/LPTS"): ArrayObject([NumberObject(v) for v in unit_square]),
        NameObject("/GCS"): gcs,
        NameObject("/PDU"): ArrayObject([NameObject("/M"), NameObject("/SQM"), NameObject("/DEG")]),
    })
    viewport = DictionaryObject({
        NameObject("/Type"): NameObject("/Viewport"),
        NameObject("/Name"): TextStringObject("Mapa"),
        NameObject("/BBox"): ArrayObject([
            FloatObject(frame.x * mm),
            FloatObject(frame.y * mm),
            FloatObject((frame.x + frame.w) * mm),
            FloatObject((frame.y + frame.h) * mm),
        ]),
        NameObject("/Measure"): measure,
    })
    page[NameObject("/VP")] = ArrayObject([viewport])

    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def build_pdf(p: PDFExportPayload) -> bytes:
    layout = compute_layout(p.paperSize, p.orientation)
    image = _decode_image(p.mapImage)
    proj = FrameProjector(p.bbox, layout.frame)
    scale = numeric_scale(p.bbox, layout.frame.w)

    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=(layout.page_w * mm, layout.page_h * mm))
    c.setTitle(p.title)
    if p.author:
        c.setAuthor(p.author)
    c.setCreator("Mapas")

    c.setFillColor(white)
    c.rect(0, 0, layout.page_w * mm, layout.page_h * mm, stroke=0, fill=1)
    _box(c, Box(MARGIN - 2, MARGIN - 2, layout.page_w - 2 * MARGIN + 4, layout.page_h - 2 * MARGIN + 4), stroke=INK, width=0.8)

    _draw_header(c, layout, p)

    f = layout.frame
    c.drawImage(image, f.x * mm, f.y * mm, f.w * mm, f.h * mm)
    if p.includeGrid:
        _draw_grid(c, layout, p, proj)
    _box(c, f, stroke=black, width=0.6)

    _draw_panel(c, layout, p, scale)

    c.showPage()
    c.save()
    pdf = buf.getvalue()

    if p.georeferenced:
        pdf = _georeference(pdf, f, p.bbox)
    return pdf
