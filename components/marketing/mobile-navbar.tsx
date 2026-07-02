"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/marketing/ui/accordion";
import { Button, buttonVariants } from "@/components/marketing/ui/button";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetTrigger
} from "@/components/marketing/ui/sheet";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/components/marketing/constants";
import { LucideIcon, Menu, X } from "lucide-react";
import Link from "next/link";
import React, { useState } from 'react';

// Radix portals the Sheet to document.body — outside #marketing-root — so the
// scoped dark theme vars don't cascade to it. Redeclared inline here instead.
const MARKETING_DARK_VARS = {
    "--foreground": "0 0% 98%",
    "--background": "0 0% 3.9%",
    "--muted": "0 0% 14.9%",
    "--muted-foreground": "0 0% 63.9%",
    "--accent": "0 0% 14.9%",
    "--accent-foreground": "0 0% 98%",
    "--border": "0 0% 14.9%",
    "--input": "0 0% 14.9%",
    "--primary": "0 0% 98%",
    "--primary-foreground": "0 0% 9%",
} as React.CSSProperties;

// Port of linkify/src/components/navigation/mobile-navbar.tsx with Clerk removed
const MobileNavbar = () => {

    const [isOpen, setIsOpen] = useState<boolean>(false);

    const handleClose = () => {
        setIsOpen(false);
    };

    return (
        <div className="flex lg:hidden items-center justify-end">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button size="icon" variant="ghost">
                        <Menu className="w-5 h-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent className="w-screen bg-background text-foreground" style={MARKETING_DARK_VARS}>
                    <SheetClose asChild className="absolute top-3 right-5 bg-background z-20 flex items-center justify-center">
                        <Button size="icon" variant="ghost" className="text-neutral-600">
                            <X className="w-5 h-5" />
                        </Button>
                    </SheetClose>
                    <div className="flex flex-col items-start w-full py-2 mt-10">
                        <div className="flex items-center justify-evenly w-full space-x-2">
                            <Link href="/auth/sign-in" className={buttonVariants({ variant: "outline", className: "w-full" })}>
                                Sign In
                            </Link>
                            <Link href="/auth/sign-up" className={buttonVariants({ className: "w-full" })}>
                                Sign Up
                            </Link>
                        </div>
                        <ul className="flex flex-col items-start w-full mt-6">
                            <Accordion type="single" collapsible className="!w-full">
                                {NAV_LINKS.map((link) => (
                                    <AccordionItem key={link.title} value={link.title} className="last:border-none">
                                        {link.menu ? (
                                            <>
                                                <AccordionTrigger>
                                                    {link.title}
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <ul
                                                        onClick={handleClose}
                                                        className={cn(
                                                            "w-full",
                                                        )}
                                                    >
                                                        {link.menu.map((menuItem) => (
                                                            <ListItem key={menuItem.title} title={menuItem.title} href={menuItem.href} icon={menuItem.icon}>
                                                                {menuItem.tagline}
                                                            </ListItem>
                                                        ))}
                                                    </ul>
                                                </AccordionContent>
                                            </>
                                        ) : (
                                            <Link
                                                href={link.href}
                                                onClick={handleClose}
                                                className="flex items-center w-full py-4 font-medium text-muted-foreground hover:text-foreground"
                                            >
                                                <span>{link.title}</span>
                                            </Link>
                                        )}
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </ul>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
};

const ListItem = React.forwardRef<
    React.ElementRef<"a">,
    React.ComponentPropsWithoutRef<"a"> & { title: string; icon: LucideIcon }
>(({ className, title, href, icon: Icon, children, ...props }, ref) => {
    return (
        <li>
            <Link
                href={href!}
                ref={ref}
                className={cn(
                    "block select-none space-y-1 rounded-lg p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    className
                )}
                {...props}
            >
                <div className="flex items-center space-x-2 text-foreground">
                    <Icon className="h-4 w-4" />
                    <h6 className="text-sm !leading-none">
                        {title}
                    </h6>
                </div>
                <p title={children! as string} className="line-clamp-1 text-sm leading-snug text-muted-foreground">
                    {children}
                </p>
            </Link>
        </li>
    )
})
ListItem.displayName = "ListItem"

export default MobileNavbar
