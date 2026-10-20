import { fromArrayBuffer } from 'geotiff';
import type { RasterLayer } from '../types';
import { isKnownCrs, toWgs84 } from './geo';

const MAX_SIZE = 2048;

type Corners = NonNullable<RasterLayer['coordinates']>;

function stretch(band: ArrayLike<number>, nodata: number | null) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < band.length; i++) {
    const v = band[i];
    if (v === nodata || !Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;
  return (v: number) => Math.round(((v - min) / range) * 255);
}

/** Reads a GeoTIFF in the browser and returns an image overlay for the map (session only). */
export async function loadGeoTiff(file: File): Promise<Pick<RasterLayer, 'image' | 'coordinates'>> {
  const tiff = await fromArrayBuffer(await file.arrayBuffer());
  const image = await tiff.getImage();
  const keys = image.getGeoKeys() ?? {};
  const epsg: number | undefined = keys.ProjectedCSTypeGeoKey ?? keys.GeographicTypeGeoKey;
  const crs = epsg ? `EPSG:${epsg}` : 'EPSG:4326';
  if (crs !== 'EPSG:4326' && !isKnownCrs(crs)) {
    throw new Error(`Sistema de referencia no soportado (${crs}). Use EPSG:4326, 3857, 9377 o 3116.`);
  }

  const [minX, minY, maxX, maxY] = image.getBoundingBox();
  const project = (x: number, y: number): [number, number] => (crs === 'EPSG:4326' ? [x, y] : toWgs84(crs, x, y));
  const coordinates: Corners = [project(minX, maxY), project(maxX, maxY), project(maxX, minY), project(minX, minY)];

  const scale = Math.min(1, MAX_SIZE / Math.max(image.getWidth(), image.getHeight()));
  const width = Math.max(1, Math.round(image.getWidth() * scale));
  const height = Math.max(1, Math.round(image.getHeight() * scale));
  const rasters = await image.readRasters({ width, height, resampleMethod: 'bilinear' });
  const bands = (Array.isArray(rasters) ? rasters : [rasters]) as unknown as ArrayLike<number>[];
  const nodata = image.getGDALNoData();

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el lienzo para el GeoTIFF');
  const out = ctx.createImageData(width, height);

  const rgb = bands.length >= 3 ? [bands[0], bands[1], bands[2]] : [bands[0], bands[0], bands[0]];
  // 8-bit imagery is already display-ready; other depths are stretched to 0-255.
  const is8bit = image.getBitsPerSample(0) === 8;
  const scales = rgb.map((b) => (is8bit ? (v: number) => v : stretch(b, nodata)));
  const alpha = bands.length >= 4 ? bands[3] : null;
  for (let i = 0; i < width * height; i++) {
    const isNoData = nodata !== null && rgb[0][i] === nodata;
    out.data[i * 4] = scales[0](rgb[0][i]);
    out.data[i * 4 + 1] = scales[1](rgb[1][i]);
    out.data[i * 4 + 2] = scales[2](rgb[2][i]);
    out.data[i * 4 + 3] = isNoData ? 0 : alpha ? alpha[i] : 255;
  }
  ctx.putImageData(out, 0, 0);

  return { image: canvas.toDataURL('image/png'), coordinates };
}
