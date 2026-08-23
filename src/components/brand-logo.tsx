import mark from "@/assets/dropayment-mark.png.asset.json";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={mark.url}
      alt="DropPay Pro"
      className={cn("size-8 rounded-lg object-contain", className)}
    />
  );
}
