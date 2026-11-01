import { Star } from "lucide-react";
import type { StoreText } from "@/i18n/store";
import type { PublicReview } from "@/lib/data/reviews";
import { reviewStats } from "@/lib/data/reviews";
import { cn, interpolate } from "@/lib/utils";
import { ReviewForm } from "./ReviewForm";

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} dir="ltr" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-4", n <= Math.round(value) ? "fill-gold text-gold" : "text-line")} aria-hidden />
      ))}
    </span>
  );
}

/** Approved customer reviews (text rendered as plain text) + "leave a review". */
export function ReviewsSection({
  reviews,
  productId,
  t,
  className,
}: {
  reviews: PublicReview[];
  productId: string | null;
  t: StoreText["reviews"];
  className?: string;
}) {
  const stats = reviewStats(reviews);
  return (
    <section className={className} aria-labelledby="reviews-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="reviews-title" className="text-xl font-bold text-ink">
          {t.title}
        </h2>
        {stats && (
          <span className="flex items-center gap-2 text-sm text-muted">
            <Stars value={stats.average} />
            {stats.average} · {interpolate(t.count, { count: stats.count })}
          </span>
        )}
      </div>
      {reviews.length > 0 && (
        <ul className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-white p-4">
              <Stars value={r.rating} />
              {r.body && <p className="mt-2 whitespace-pre-line text-sm text-ink">{r.body}</p>}
              <p className="mt-2 text-xs font-medium text-muted">— {r.customer_name}</p>
            </li>
          ))}
        </ul>
      )}
      <ReviewForm productId={productId} t={t} />
    </section>
  );
}
