import re

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response

from api.core.security import get_current_user
from api.models.usuario import Usuario
from api.schemas.exportar import MapFrameOut, Orientation, PaperSize, PDFExportPayload
from api.services.pdf_layout import build_pdf, frame_pixels

router = APIRouter(prefix="/exportar", tags=["exportar"])


@router.get("/marco", response_model=MapFrameOut)
def get_map_frame(
    paperSize: PaperSize = "A4",
    orientation: Orientation = "landscape",
    dpi: int = 300,
    current_user: Usuario = Depends(get_current_user),
):
    """Size of the map frame for a layout, so the client captures the map at that size."""
    if not 72 <= dpi <= 600:
        raise HTTPException(status_code=422, detail="dpi debe estar entre 72 y 600")
    w_mm, h_mm, w_px, h_px = frame_pixels(paperSize, orientation, dpi)
    return MapFrameOut(
        paperSize=paperSize,
        orientation=orientation,
        dpi=dpi,
        widthMm=w_mm,
        heightMm=h_mm,
        widthPx=w_px,
        heightPx=h_px,
    )


@router.post("/pdf")
async def export_pdf(
    payload: PDFExportPayload,
    current_user: Usuario = Depends(get_current_user),
):
    try:
        pdf = await run_in_threadpool(build_pdf, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    slug = re.sub(r"[^a-z0-9]+", "_", payload.title.lower()).strip("_") or "mapa"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{slug}.pdf"'},
    )
