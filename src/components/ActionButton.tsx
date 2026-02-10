import type { ButtonHTMLAttributes } from "react";
import { cn } from "../utils/classNames";

type Variant = "primary" | "outline" | "ghost" | "danger";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const variantStyles: Record<Variant, string> = {
  primary: "bg-sky-600 text-white shadow-glow hover:bg-sky-700",
  outline: "border border-sky-200 text-ink-700 hover:border-sky-300 hover:bg-sky-100",
  ghost: "text-ink-700 hover:bg-sky-100",
  danger: "border border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100",
};

const ActionButton = ({
  variant = "primary",
  className,
  ...props
}: ActionButtonProps) => (
  <button
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
      variantStyles[variant],
      className
    )}
    {...props}
  />
);

export default ActionButton;
