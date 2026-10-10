import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Check, RotateCcw } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { cropImageWithSettings } from '../../utils/imageUpload';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  title?: string;
  isCircular?: boolean;
  onApply: (dataUri: string) => Promise<void> | void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  title = 'Crop & Adjust Image',
  isCircular = false,
  onApply,
}) => {
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [previewUri, setPreviewUri] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);

  // Update preview when adjustments change
  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    let isMounted = true;
    cropImageWithSettings(imageSrc, { zoom, offsetX, offsetY }, 320, true)
      .then((uri) => {
        if (isMounted) setPreviewUri(uri);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isOpen, imageSrc, zoom, offsetX, offsetY]);

  const handleReset = () => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const finalUri = await cropImageWithSettings(
        imageSrc,
        { zoom, offsetX, offsetY },
        512,
        !isCircular
      );
      await onApply(finalUri);
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-5">
        {/* Preview Frame */}
        <div className="flex flex-col items-center justify-center p-4 bg-[#F7F8FA] dark:bg-[#171923] rounded-2xl border border-[#E5E7EB] dark:border-[#343B4B]">
          <div
            className={`relative w-48 h-48 overflow-hidden bg-white dark:bg-[#202430] border-2 border-indigo-500 shadow-md flex items-center justify-center ${
              isCircular ? 'rounded-full' : 'rounded-2xl'
            }`}
          >
            {previewUri ? (
              <img
                src={previewUri}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">Loading preview...</div>
            )}
          </div>
          <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-2.5">
            {isCircular ? 'Circular avatar preview' : 'Square icon preview (transparency preserved)'}
          </p>
        </div>

        {/* Zoom Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#171923] dark:text-[#F9FAFB]">
            <span className="flex items-center gap-1.5">
              <ZoomIn className="w-3.5 h-3.5 text-indigo-500" />
              Zoom Scale
            </span>
            <span>{zoom.toFixed(1)}x</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(1)))}
              className="p-1 rounded bg-[#F7F8FA] dark:bg-[#272D3A] text-[#171923] dark:text-[#F9FAFB] border border-[#E5E7EB] dark:border-[#343B4B] hover:bg-indigo-50"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-[#4F46E5] h-1.5 bg-[#E5E7EB] dark:bg-[#343B4B] rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(1)))}
              className="p-1 rounded bg-[#F7F8FA] dark:bg-[#272D3A] text-[#171923] dark:text-[#F9FAFB] border border-[#E5E7EB] dark:border-[#343B4B] hover:bg-indigo-50"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Reposition Controls */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#626B7A] dark:text-[#A7AFBD]">
              Horizontal Pan
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              value={offsetX}
              onChange={(e) => setOffsetX(parseInt(e.target.value, 10))}
              className="w-full accent-[#4F46E5] h-1.5 bg-[#E5E7EB] dark:bg-[#343B4B] rounded-lg cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#626B7A] dark:text-[#A7AFBD]">
              Vertical Pan
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              value={offsetY}
              onChange={(e) => setOffsetY(parseInt(e.target.value, 10))}
              className="w-full accent-[#4F46E5] h-1.5 bg-[#E5E7EB] dark:bg-[#343B4B] rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB] dark:border-[#343B4B]">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-[#F9FAFB]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Crop
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isApplying}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
              isLoading={isApplying}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Apply Crop
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ImageCropModal;
