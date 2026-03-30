// file: components/common/StarRating.tsx
import React from "react";
import { Icon } from "@iconify/react";
import { cn } from "@heroui/react";

interface StarRatingProps {
  rating: number; // 当前分数 (0-5)
  maxStars?: number;
  size?: number;
  isReadOnly?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

export const StarRating = ({
  rating,
  maxStars = 5,
  size = 16,
  isReadOnly = true,
  onChange,
  className,
}: StarRatingProps) => {
  const [hoverRating, setHoverRating] = React.useState(0);

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[...Array(maxStars)].map((_, index) => {
        const starValue = index + 1;
        // 判断显示实心还是空心 (考虑 hover 状态)
        const isFilled = isReadOnly
          ? starValue <= rating
          : starValue <= (hoverRating || rating);

        return (
          <button
            key={index}
            className={cn(
              "transition-transform",
              !isReadOnly && "cursor-pointer hover:scale-110",
            )}
            disabled={isReadOnly}
            type="button"
            onClick={() => onChange?.(starValue)}
            onMouseEnter={() => !isReadOnly && setHoverRating(starValue)}
            onMouseLeave={() => !isReadOnly && setHoverRating(0)}
          >
            <Icon
              className={cn(
                "transition-colors",
                isFilled ? "text-warning-500" : "text-default-300",
              )}
              icon={isFilled ? "solar:star-bold" : "solar:star-linear"}
              width={size}
            />
          </button>
        );
      })}
    </div>
  );
};
