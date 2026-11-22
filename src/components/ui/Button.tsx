import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-110 shadow-lg shadow-accent/20",
  secondary: "bg-surface-2 text-text border border-line hover:border-muted/50",
  danger: "bg-bad/15 text-bad border border-bad/30 hover:bg-bad/25",
  success: "bg-ok text-on-accent hover:brightness-110 shadow-lg shadow-ok/20",
  ghost: "text-muted hover:bg-surface-2 hover:text-text",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-base gap-2 rounded-xl",
  xl: "h-16 px-8 text-xl gap-3 rounded-2xl",
};

export function Button({ variant = "secondary", size = "md", loading, icon, children, className = "", disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium whitespace-nowrap transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon}
      {children}
    </button>
  );
}
