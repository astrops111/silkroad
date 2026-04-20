import { Star } from "lucide-react";

interface ReviewCardProps {
  rating: number;
  title?: string;
  content?: string;
  reviewerName: string;
  reviewerCompany?: string;
  reviewerCountry?: string;
  date: string;
  productQualityRating?: number;
  communicationRating?: number;
  shippingRating?: number;
  isVerifiedPurchase?: boolean;
}

function Stars({ count, size = "w-3.5 h-3.5" }: { count: number; size?: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${i <= count ? "fill-[var(--amber)] text-[var(--amber)]" : "text-[var(--border-strong)]"}`}
        />
      ))}
    </div>
  );
}

export function ReviewCard({
  rating,
  title,
  content,
  reviewerName,
  reviewerCompany,
  reviewerCountry,
  date,
  productQualityRating,
  communicationRating,
  shippingRating,
  isVerifiedPurchase,
}: ReviewCardProps) {
  return (
    <div className="p-4 rounded-xl border border-[var(--border-subtle)] space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Stars count={rating} />
            {isVerifiedPurchase && (
              <span className="text-[10px] font-semibold text-[var(--success)] bg-[var(--success)]/10 px-1.5 py-0.5 rounded">
                Verified Purchase
              </span>
            )}
          </div>
          {title && <p className="font-semibold text-sm text-[var(--obsidian)] mt-1">{title}</p>}
        </div>
        <span className="text-xs text-[var(--text-tertiary)]">
          {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {content && <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{content}</p>}

      {(productQualityRating || communicationRating || shippingRating) && (
        <div className="flex gap-4 text-xs text-[var(--text-tertiary)]">
          {productQualityRating && (
            <span className="flex items-center gap-1">Quality: <Stars count={productQualityRating} size="w-3 h-3" /></span>
          )}
          {communicationRating && (
            <span className="flex items-center gap-1">Communication: <Stars count={communicationRating} size="w-3 h-3" /></span>
          )}
          {shippingRating && (
            <span className="flex items-center gap-1">Shipping: <Stars count={shippingRating} size="w-3 h-3" /></span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <span className="font-medium text-[var(--text-secondary)]">{reviewerName}</span>
        {reviewerCompany && <span>· {reviewerCompany}</span>}
        {reviewerCountry && <span>· {reviewerCountry}</span>}
      </div>
    </div>
  );
}
