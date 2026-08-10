import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import logoMark from "@/assets/dahabo-logo-mark.png";

export function Logo({
  className,
  variant = "default",
  size = "md",
}: {
  className?: string;
  variant?: "default" | "light";
  size?: "sm" | "md" | "lg";
}) {
  const mark = size === "lg" ? "size-20" : size === "sm" ? "size-14" : "size-16";
  const nameSize = size === "lg" ? "text-lg sm:text-xl" : size === "sm" ? "text-sm" : "text-base";
  const subSize = size === "lg" ? "text-[12px]" : "text-[10px]";
  return (
    <Link to="/" className={cn("group flex items-center gap-3.5", className)} aria-label="Dahabo Global Logistics home">
      <img
        src={logoMark}
        alt="Dahabo Global Logistics"
        width={512}
        height={512}
        className={cn(mark, "shrink-0 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105")}
      />
      <span className="flex min-w-0 flex-col justify-center leading-none">
        <span
          className={cn(
            "whitespace-nowrap font-display font-extrabold tracking-tight",
            nameSize,
            variant === "light" ? "text-navy-foreground" : "text-foreground",
          )}
        >
          DAHABO GLOBAL
        </span>
        <span
          className={cn(
            "mt-1.5 whitespace-nowrap font-semibold uppercase tracking-[0.22em]",
            subSize,
            variant === "light" ? "text-gold" : "text-muted-foreground",
          )}
        >
          Logistics Limited
        </span>
      </span>
    </Link>
  );
}
