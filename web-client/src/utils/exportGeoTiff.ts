import { writeArrayBuffer } from 'geotiff';
import type { Bounds } from '../types';
import { toProjected } from './geo';
import { downloadBlob, slugify } from './download';

interface GeoTiffOptions {
  projectName: string;
  mapImage: string;
  bbox: Bounds;
}

/** Writes the captured map (a Web Mercator image) as a GeoTIFF in EPSG:3857. */
export async function exportGeoTiff(options: GeoTiffOptions) {
  const { projectName, mapImage, bbox } = options;

  try {
    const img = new Image();
    img.src = mapImage;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error("Could not create canvas context");
    
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    const values = Array.from(imageData.data);

    const [minX, minY] = toProjected('EPSG:3857', bbox[0], bbox[1]);
    const [maxX, maxY] = toProjected('EPSG:3857', bbox[2], bbox[3]);

    const metadata = {
      width: canvas.width,
      height: canvas.height,
      ModelTiepoint: [0, 0, 0, minX, maxY, 0],
      ModelPixelScale: [(maxX - minX) / canvas.width, (maxY - minY) / canvas.height, 0],
      GTModelTypeGeoKey: 1,
      GTRasterTypeGeoKey: 1,
      ProjectedCSTypeGeoKey: 3857,
      PhotometricInterpretation: 2,
    };

    const arrayBuffer = await writeArrayBuffer(values, metadata);
    downloadBlob(new Blob([arrayBuffer], { type: 'image/tiff' }), `${slugify(projectName)}_georeferenciado.tiff`);
  } catch (error) {
    console.error('GeoTIFF Generation Error:', error);
    throw error;
  }
}
