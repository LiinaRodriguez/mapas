import { writeArrayBuffer } from 'geotiff';

interface GeoTiffOptions {
  projectName: string;
  mapImage: string;
  mapBounds: any;
}

export async function exportGeoTiff(options: GeoTiffOptions) {
  const { projectName, mapImage, mapBounds } = options;

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

    const sw = mapBounds.getSouthWest();
    const ne = mapBounds.getNorthEast();

    const metadata = {
      width: canvas.width,
      height: canvas.height,
      ModelTiepoint: [0, 0, 0, sw.lng, ne.lat, 0],
      ModelPixelScale: [
        (ne.lng - sw.lng) / canvas.width,
        (ne.lat - sw.lat) / canvas.height,
        0
      ],
      GeographicTypeGeoKey: 4326,
      GeogCitationGeoKey: 'WGS 84',
      PhotometricInterpretation: 2,
    };

    const arrayBuffer = await writeArrayBuffer(values, metadata);

    const blob = new Blob([arrayBuffer], { type: 'image/tiff' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    const fileName = `${projectName.toLowerCase().replace(/\s+/g, '_')}_georeferenciado.tiff`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('GeoTIFF Generation Error:', error);
    alert('Error al generar el GeoTIFF. Revisa la consola.');
  }
}
