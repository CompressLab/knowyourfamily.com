import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-amber-100 text-amber-800",
        secondary: "bg-stone-100 text-stone-700",
        destructive: "bg-red-100 text-red-700",
        outline: "border border-stone-200 text-stone-700",
        success: "bg-emerald-100 text-emerald-700",
        family: "bg-blue-100 text-blue-700",
        friend: "bg-purple-100 text-purple-700",
        pending: "bg-yellow-100 text-yellow-700",
        private: "bg-red-50 text-red-600 border border-red-200",
        shared: "bg-green-50 text-green-600 border border-green-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
