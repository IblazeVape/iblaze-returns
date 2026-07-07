"use client";

import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/marketing/animated-beam";
import { ShoppingBagIcon, UserIcon } from "lucide-react";
import React, { forwardRef, useRef } from "react";

const Circle = forwardRef<HTMLDivElement, { className?: string; children?: React.ReactNode }>(
    function Circle({ className, children }, ref) {
        return (
            <div
                ref={ref}
                className={cn(
                    "z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]",
                    className,
                )}
            >
                {children}
            </div>
        );
    }
);

// One-click Shopify connection: your store syncs into Reflow, Reflow serves
// your customer. Replaces the generic multi-app Integrations beam — Shopify
// is the only integration, so the widget says exactly that.
export function ShopifyConnect({
    className,
}: {
    className?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const storeRef = useRef<HTMLDivElement>(null);
    const reflowRef = useRef<HTMLDivElement>(null);
    const customerRef = useRef<HTMLDivElement>(null);

    return (
        <div
            className={cn(
                "relative flex w-full max-w-[500px] items-center justify-center overflow-hidden rounded-lg border bg-background p-10 md:shadow-xl",
                className,
            )}
            ref={containerRef}
        >
            <div className="flex h-full w-full flex-row items-center justify-between gap-10">
                <div className="flex flex-col items-center gap-2">
                    <Circle ref={storeRef} className="border-[#95BF47]/60">
                        <ShoppingBagIcon className="h-6 w-6 text-[#5E8E3E]" />
                    </Circle>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Your Shopify store
                    </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <Circle ref={reflowRef} className="h-16 w-16 border-violet-500/60">
                        <span className="font-heading text-xl font-bold text-black leading-none!">
                            R
                        </span>
                    </Circle>
                    <span className="text-xs text-muted-foreground">
                        Reflow
                    </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <Circle ref={customerRef}>
                        <UserIcon className="h-6 w-6 text-black" />
                    </Circle>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Your customer
                    </span>
                </div>
            </div>

            <AnimatedBeam
                containerRef={containerRef}
                fromRef={storeRef}
                toRef={reflowRef}
                duration={3}
            />
            <AnimatedBeam
                containerRef={containerRef}
                fromRef={reflowRef}
                toRef={customerRef}
                duration={3}
                delay={1.5}
            />
            <AnimatedBeam
                containerRef={containerRef}
                fromRef={customerRef}
                toRef={reflowRef}
                duration={3}
                delay={3}
                reverse
            />
        </div>
    );
}
