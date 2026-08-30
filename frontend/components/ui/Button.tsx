import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        {
          "bg-signal text-white hover:bg-signal-hover": variant === "primary",
          "bg-white text-ink border border-paper-border hover:bg-paper": variant === "secondary",
          "text-muted hover:text-ink": variant === "ghost",
          "bg-danger text-white hover:opacity-90": variant === "danger",
        },
        className
      )}
      {...props}
    />
  );
}
