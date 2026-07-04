import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  src: string | null;
  onClose: () => void;
}

export function PhotoLightbox({ src, onClose }: Props) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
      />
    </div>
  );
}
