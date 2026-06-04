function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (err) => reject(err));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

const toRad = (deg) => (deg * Math.PI) / 180;

function rotatedSize(width, height, rotation) {
  const rad = toRad(rotation);
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

/**
 * Produce a cropped JPEG blob from a source image, crop rectangle (in source
 * pixels) and rotation, scaled to a fixed passport-style output (2.5×3.5 cm).
 */
export async function getCroppedImg(imageSrc, pixelCrop, rotation = 0, target = { width: 590, height: 826 }) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const { width: bw, height: bh } = rotatedSize(image.width, image.height, rotation);
  canvas.width = bw;
  canvas.height = bh;

  // Draw the (rotated) image centred on the canvas.
  ctx.translate(bw / 2, bh / 2);
  ctx.rotate(toRad(rotation));
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const cropped = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);

  // Put the crop on a temp canvas, then scale it onto the target-size output.
  const tmp = document.createElement('canvas');
  tmp.width = pixelCrop.width;
  tmp.height = pixelCrop.height;
  tmp.getContext('2d').putImageData(cropped, 0, 0);

  const out = document.createElement('canvas');
  out.width = target.width;
  out.height = target.height;
  const octx = out.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(tmp, 0, 0, pixelCrop.width, pixelCrop.height, 0, 0, target.width, target.height);

  return new Promise((resolve) => out.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92));
}
