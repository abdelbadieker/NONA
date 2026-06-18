import { Star } from "lucide-react";

export function Reviews({
  title,
  items,
}: {
  title: string;
  items: { name: string; text: string; rating: number }[];
}) {
  return (
    <section className="bg-cream py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-xl font-bold text-ink sm:text-2xl">{title}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {items.map((r, i) => (
            <figure
              key={i}
              className="rounded-2xl border border-line bg-white p-5"
            >
              <div className="flex gap-0.5" aria-hidden>
                {Array.from({ length: r.rating }).map((_, j) => (
                  <Star key={j} className="size-4 fill-gold text-gold" />
                ))}
              </div>
              <blockquote className="mt-3 text-sm leading-relaxed text-ink">
                {r.text}
              </blockquote>
              <figcaption className="mt-3 text-sm font-semibold text-blush-dark">
                — {r.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
