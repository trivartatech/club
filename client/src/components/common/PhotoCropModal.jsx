import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../../utils/cropImage';

// Passport photo: 2.5 cm wide × 3.5 cm tall (portrait).
const ASPECT = 2.5 / 3.5;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 4;
const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100));

export default function PhotoCropModal({ imageSrc, onCancel, onCropped }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pixels, setPixels] = useState(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_area, areaPixels) => setPixels(areaPixels), []);

  async function apply() {
    if (!pixels) return;
    setBusy(true);
    try {
      const blob = await getCroppedImg(imageSrc, pixels, rotation);
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      onCropped(file, URL.createObjectURL(blob));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold">Crop Photo</h3>
          <span className="text-xs text-gray-400">Passport size · 2.5 × 3.5 cm</span>
        </div>

        <div className="relative bg-gray-900" style={{ height: 340 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={ASPECT}
            cropShape="rect"
            showGrid
            zoomSpeed={0.2}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            restrictPosition={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 flex justify-between mb-1"><span>Zoom</span><span>{zoom.toFixed(2)}×</span></label>
            <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-full accent-primary-700" />
            <div className="flex gap-2 mt-1">
              <button type="button" onClick={() => setZoom(z => clampZoom(z - 0.1))} className="btn-sm">− Zoom out</button>
              <button type="button" onClick={() => setZoom(z => clampZoom(z + 0.1))} className="btn-sm">+ Zoom in</button>
              <button type="button" onClick={() => setZoom(1)} className="btn-sm">Reset</button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 flex justify-between mb-1"><span>Rotation (slight angle)</span><span>{rotation}°</span></label>
            <input type="range" min={-45} max={45} step={1} value={rotation} onChange={e => setRotation(Number(e.target.value))} className="w-full accent-primary-700" />
            <div className="flex gap-2 mt-1">
              <button type="button" onClick={() => setRotation(r => Math.max(-45, r - 1))} className="btn-sm">−1°</button>
              <button type="button" onClick={() => setRotation(r => Math.min(45, r + 1))} className="btn-sm">+1°</button>
              <button type="button" onClick={() => setRotation(0)} className="btn-sm">Reset</button>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" disabled={busy} onClick={apply} className="btn-primary flex-1">{busy ? 'Applying…' : 'Apply Crop'}</button>
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
