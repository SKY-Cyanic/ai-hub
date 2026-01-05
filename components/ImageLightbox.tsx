
import React, { useState } from 'react';
import { X, ZoomIn } from 'lucide-react';

interface ImageLightboxProps {
    src: string;
    alt?: string;
    onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, alt, onClose }) => {
    return (
        <div
            className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-6 right-6 text-white/80 hover:text-white p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
                <X size={24} />
            </button>
            <img
                src={src}
                alt={alt || 'Image'}
                className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
};

// Hook for using lightbox
export const useImageLightbox = () => {
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    const openLightbox = (src: string) => setLightboxImage(src);
    const closeLightbox = () => setLightboxImage(null);

    const LightboxComponent = lightboxImage ? (
        <ImageLightbox src={lightboxImage} onClose={closeLightbox} />
    ) : null;

    return { openLightbox, closeLightbox, LightboxComponent };
};

export default ImageLightbox;
