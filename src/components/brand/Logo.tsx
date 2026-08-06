import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/dahabo-mark.png.asset.json";

export function Logo({
  className,
  variant = "default",
  size = "md",
}: {
  className?: string;
  variant?: "default" | "light";
  size?: "sm" | "md" | "lg";
}) {
  const mark = size === "lg" ? "size-14" : size === "sm" ? "size-9" : "size-11";
  return (
    <Link to="/" className={cn("group flex items-center gap-3", className)} aria-label="Dahabo Global Logistics home">
      <img
        src={logoAsset.url}
        alt="Dahabo Global Logistics"
        width={112}
        height={112}
        className={cn(mark, "shrink-0 object-contain transition-transform duration-300 group-hover:scale-105")}
      />
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            "font-display text-[15px] font-extrabold tracking-tight",
            variant === "light" ? "text-navy-foreground" : "text-foreground",
          )}
        >
          DAHABO GLOBAL
        </span>
        <span
          className={cn(
            "mt-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
            variant === "light" ? "text-gold" : "text-muted-foreground",
          )}
        >
          Logistics Limited
        </span>
      </span>
    </Link>
  );
}
