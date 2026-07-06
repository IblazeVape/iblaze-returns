import { cn } from "@/lib/utils";

const Kbd = ({ className, ...props }: React.ComponentProps<"kbd">) => (
  <kbd
    data-slot="kbd"
    className={cn(
      "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs/none font-normal text-muted-foreground select-none [&_svg:not([class*='size-'])]:size-3",
      "bg-black/5 shadow-[inset_0_-1px_2px] shadow-black/10 dark:bg-white/10 dark:shadow-white/10",
      "[[data-slot=tooltip-content]_&]:bg-white/20 [[data-slot=tooltip-content]_&]:text-background [[data-slot=tooltip-content]_&]:shadow-white/20 dark:[[data-slot=tooltip-content]_&]:bg-black/10 dark:[[data-slot=tooltip-content]_&]:shadow-black/10",
      className
    )}
    {...props}
  />
);

const KbdGroup = ({ className, ...props }: React.ComponentProps<"div">) => (
  <kbd
    data-slot="kbd-group"
    className={cn("inline-flex items-center gap-1", className)}
    {...props}
  />
);

export { Kbd, KbdGroup };
