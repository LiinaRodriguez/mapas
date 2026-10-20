"""Pydantic schemas for the PDF export (PDFExportPayload)."""

from typing import List, Literal, Optional, Union

from pydantic import BaseModel, Field, field_validator

PaperSize = Literal["Carta", "A4", "A3"]
Orientation = Literal["landscape", "portrait"]
GridCrs = Literal["EPSG:4326", "EPSG:9377", "EPSG:3116"]


class LegendClass(BaseModel):
    label: str
    color: str


class LegendItem(BaseModel):
    label: str
    geometryType: Literal["polygon", "line", "point"] = "polygon"
    fillColor: str = "#3b82f6"
    strokeColor: str = "#3b82f6"
    fillOpacity: float = Field(0.25, ge=0, le=1)
    strokeWidth: float = 2
    classes: List[LegendClass] = []


class PDFExportPayload(BaseModel):
    title: str = Field(..., min_length=1)
    subtitle: Optional[str] = None
    notes: Optional[str] = None
    author: Optional[str] = None
    license: Optional[str] = None
    paperSize: PaperSize = "A4"
    orientation: Orientation = "landscape"
    dpi: int = Field(300, ge=72, le=600)
    bbox: List[float] = Field(..., min_length=4, max_length=4)
    includeLegend: bool = True
    includeGrid: bool = True
    includeNorthArrow: bool = True
    includeScale: bool = True
    gridCrs: GridCrs = "EPSG:4326"
    georeferenced: bool = True
    layers: List[Union[int, str]] = []
    legend: List[LegendItem] = []
    mapImage: str = Field(..., description="Map frame image as a data URL (JPEG or PNG)")

    @field_validator("bbox")
    @classmethod
    def _valid_bbox(cls, v: List[float]) -> List[float]:
        west, south, east, north = v
        if not (-180 <= west < east <= 180 and -85.06 <= south < north <= 85.06):
            raise ValueError("bbox debe ser [oeste, sur, este, norte] en WGS84")
        return v


class MapFrameOut(BaseModel):
    paperSize: PaperSize
    orientation: Orientation
    dpi: int
    widthMm: float
    heightMm: float
    widthPx: int
    heightPx: int
