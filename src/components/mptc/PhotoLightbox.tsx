import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  images: string[];
  startIndex: number;
  open: boolean;
  onClose: () => void;
}

export function PhotoLightbox({ images, startIndex, open, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, images.length, onClose]);

  useEffect(() => {
    if (!open) return;
    const neighbors = [index - 1, index + 1].filter((i) => i >= 0 && i < images.length);
    neighbors.forEach((i) => {
      const img = new Image();
      img.src = images[i];
    });
  }, [open, index, images]);

  if (!open || !images.length) return null;

  const src = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
      >
        <X className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIndex((i) => Math.max(0, i - 1)); }}
        disabled={!hasPrev}
        aria-label="Foto anterior"
        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 disabled:opacity-30 disabled:hover:bg-black/60 sm:left-4"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIndex((i) => Math.min(images.length - 1, i + 1)); }}
        disabled={!hasNext}
        aria-label="Foto siguiente"
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 disabled:opacity-30 disabled:hover:bg-black/60 sm:right-4"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="flex flex-col items-center gap-2">
        <img
          src={src}
          alt={`Foto ${index + 1} de ${images.length}`}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
        />
        <div className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
          {index + 1} / {images.length}
        </div>
      </div>
    </div>
  );
}
