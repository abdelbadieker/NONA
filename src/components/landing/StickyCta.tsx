"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Mobile bottom bar that jumps to the order form; hides while the form is visible. */
export function StickyCta({
  label,
  color,
  textColor,
  shape,
}: {
  label: string;
  color: string;
  textColor: string;
  shape: "square" | "rounded" | "pill";
}) {
  const [formVisible, setFormVisible] = useState(true);
  useEffect(() => {
    const el = document.getElementById("order");
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (formVisible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
      <a
        href="#order"
        className={cn(
          "animate-cta mx-auto block max-w-lg py-3.5 text-center text-lg font-bold shadow-lg",
          shape === "pill" ? "rounded-full" : shape === "rounded" ? "rounded-xl" : "rounded-none",
        )}
        style={{ backgroundColor: color, color: textColor }}
      >
        {label}
      </a>
    </div>
  );
}
