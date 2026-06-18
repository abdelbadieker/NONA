"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  alt,
}: {
  images: { url: string }[];
  alt: string;
}) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);

  if (!images.length) {
    return <div className="aspect-[3/4] w-full rounded-2xl bg-blush-light" />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setZoom(true)}
        aria-label={alt}
        className="group relative block aspect-[3/4] w-full overflow-hidden rounded-2xl bg-blush-light"
      >
        <Image
          src={images[active].url}
          alt={alt}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 500px"
          className="object-cover"
        />
        <span className="absolute end-3 bottom-3 grid size-9 place-items-center rounded-full bg-white/80 text-ink backdrop-blur">
          <ZoomIn className="size-4" aria-hidden />
        </span>
      </button>

      {images.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {images.map((im, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${alt} ${i + 1}`}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-lg border-2",
                i === active ? "border-blush-dark" : "border-transparent",
              )}
            >
              <Image src={im.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute end-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 text-white"
            aria-label="close"
          >
            <X className="size-5" aria-hidden />
          </button>
          <div className="relative h-[82vh] w-full max-w-2xl">
            <Image
              src={images[active].url}
              alt={alt}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
