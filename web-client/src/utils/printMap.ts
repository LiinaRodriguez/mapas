import maplibregl from 'maplibre-gl';
import type { Bounds } from '../types';

const IDLE_TIMEOUT_MS = 15000;

interface CaptureOptions {
  widthPx: number;
  heightPx: number;
  dpi: number;
  bbox: Bounds;
}

/**
 * Renders the current map style off screen at the exact pixel size of the PDF map frame,
 * north up, and returns the image with the bbox that was actually rendered.
 */
export async function captureMap(map: maplibregl.Map, opts: CaptureOptions): Promise<{ image: string; bbox: Bounds }> {
  const ratio = opts.dpi / 96;
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    left: '-100000px',
    top: '0',
    width: `${opts.widthPx / ratio}px`,
    height: `${opts.heightPx / ratio}px`,
  });
  document.body.appendChild(container);

  const printMap = new maplibregl.Map({
    container,
    style: map.getStyle(),
    bounds: opts.bbox,
    fitBoundsOptions: { padding: 0 },
    bearing: 0,
    pitch: 0,
    interactive: false,
    attributionControl: false,
    fadeDuration: 0,
    pixelRatio: ratio,
    maxCanvasSize: [16384, 16384],
    canvasContextAttributes: { preserveDrawingBuffer: true },
  });

  try {
    let styleLoaded = false;
    printMap.once('style.load', () => { styleLoaded = true; });
    await new Promise<void>((resolve, reject) => {
      // Slow or unreachable basemap tiles must not block the export: after the
      // grace period, print whatever has rendered (vector layers are local data).
      const fallback = setTimeout(() => {
        if (!styleLoaded) {
          reject(new Error('El mapa no terminó de cargar para la exportación'));
          return;
        }
        console.warn('Exportando sin esperar todas las teselas del mapa base');
        printMap.once('render', () => resolve());
        printMap.triggerRepaint();
      }, IDLE_TIMEOUT_MS);
      printMap.once('idle', () => {
        clearTimeout(fallback);
        resolve();
      });
    });

    const b = printMap.getBounds();
    const image = printMap.getCanvas().toDataURL('image/jpeg', 0.92);
    return { image, bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] };
  } finally {
    printMap.remove();
    container.remove();
  }
}
