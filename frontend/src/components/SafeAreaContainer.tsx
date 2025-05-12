import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SafeAreaContainerProps {
  children: ReactNode;
  insets?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  className?: string;
}

export function SafeAreaContainer({
  children,
  insets,
  className,
}: SafeAreaContainerProps) {
  return (
    <div
      className={cn("h-full w-full overflow-hidden", className)}
      style={{
        paddingTop: insets?.top ? `${insets.top}px` : 0,
        paddingRight: insets?.right ? `${insets.right}px` : 0,
        paddingBottom: insets?.bottom ? `${insets.bottom}px` : 0,
        paddingLeft: insets?.left ? `${insets.left}px` : 0,
      }}>
      {children}
    </div>
  );
}
