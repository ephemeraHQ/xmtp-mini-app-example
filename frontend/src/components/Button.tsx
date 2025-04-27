import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "xs" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          
          // Variants
          variant === "default" && 
            "bg-primary text-primary-foreground hover:bg-primary/90 border border-white",
          variant === "destructive" && 
            "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          variant === "outline" && 
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
          variant === "secondary" && 
            "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          variant === "ghost" && 
            "hover:bg-accent hover:text-accent-foreground",
          variant === "link" && 
            "text-primary underline-offset-4 hover:underline",
          
          // Sizes
          size === "default" && "h-10 px-4 py-2",
          size === "sm" && "h-9 rounded-md px-3",
          size === "lg" && "h-11 rounded-md px-8",
          size === "xs" && "h-8 rounded-md px-2 text-sm",
          size === "icon" && "h-10 w-10",
          
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button }; 