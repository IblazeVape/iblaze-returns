import AnimationContainer from "@/components/marketing/animation-container";
import MaxWidthWrapper from "@/components/marketing/max-width-wrapper";
import PricingCards from "@/components/marketing/pricing-cards";
import { BentoCard, BentoGrid, CARDS } from "@/components/marketing/bento-grid";
import { BorderBeam } from "@/components/marketing/border-beam";
import { Button } from "@/components/marketing/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/marketing/card";
import { LampContainer } from "@/components/marketing/lamp";
import MagicBadge from "@/components/marketing/magic-badge";
import MagicCard from "@/components/marketing/magic-card";
import { PROCESS, REVIEWS } from "@/components/marketing/constants";
import { ArrowRightIcon, CreditCardIcon, StarIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// The /marketing (Linkify-style, dark) page sections, extracted so they can be
// composed both by app/marketing/page.tsx and by the Puck page builder.
// Every prop defaults to the original copy, so rendering with no props is
// pixel-identical to the original page.

export interface HeroOneProps {
    badge?: string;
    headline?: string;
    accent?: string;
    subtextLine1?: string;
    subtextLine2?: string;
    ctaLabel?: string;
    ctaHref?: string;
    showDashboardImage?: boolean;
}

export function HeroOne({
    badge = "✨ Manage returns smarter",
    headline = "Smart Returns with",
    accent = "Precision",
    subtextLine1 = "Effortlessly streamline your Shopify returns with Reflow.",
    subtextLine2 = "Brand, track, and manage all your returns in one place.",
    ctaLabel = "Start creating for free",
    ctaHref = "/demo",
    showDashboardImage = true,
}: HeroOneProps) {
    return (
        <MaxWidthWrapper>
            <div className="flex flex-col items-center justify-center w-full text-center bg-gradient-to-t from-background">
                <AnimationContainer className="flex flex-col items-center justify-center w-full text-center">
                    <button className="group relative grid overflow-hidden rounded-full px-4 py-1 shadow-[0_1000px_0_0_hsl(0_0%_20%)_inset] transition-colors duration-200">
                        <span>
                            <span className="spark mask-gradient absolute inset-0 h-[100%] w-[100%] animate-flip overflow-hidden rounded-full [mask:linear-gradient(white,_transparent_50%)] before:absolute before:aspect-square before:w-[200%] before:rotate-[-90deg] before:animate-rotate before:bg-[conic-gradient(from_0deg,transparent_0_340deg,white_360deg)] before:content-[''] before:[inset:0_auto_auto_50%] before:[translate:-50%_-15%]" />
                        </span>
                        <span className="backdrop absolute inset-[1px] rounded-full bg-neutral-950 transition-colors duration-200 group-hover:bg-neutral-900" />
                        <span className="h-full w-full blur-md absolute bottom-0 inset-x-0 bg-gradient-to-tr from-primary/20"></span>
                        <span className="z-10 py-0.5 text-sm text-neutral-100 flex items-center justify-center gap-1">
                            {badge}
                            <ArrowRightIcon className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
                        </span>
                    </button>
                    <h1 className="text-foreground text-center py-6 text-5xl font-medium tracking-normal text-balance sm:text-6xl md:text-7xl lg:text-8xl !leading-[1.15] w-full font-heading">
                        {headline}{" "}
                        <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text inline-bloc">
                            {accent}
                        </span>
                    </h1>
                    <p className="mb-12 text-lg tracking-tight text-muted-foreground md:text-xl text-balance">
                        {subtextLine1}
                        <br className="hidden md:block" />
                        <span className="hidden md:block">{subtextLine2}</span>
                    </p>
                    <div className="flex items-center justify-center whitespace-nowrap gap-4 z-50">
                        <Button asChild>
                            <Link href={ctaHref} className="flex items-center">
                                {ctaLabel}
                                <ArrowRightIcon className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    </div>
                </AnimationContainer>

                {showDashboardImage && (
                    <AnimationContainer delay={0.2} className="relative pt-20 pb-4 md:pt-32 md:pb-10 px-2 bg-transparent w-full">
                        <div className="absolute md:top-[10%] left-1/2 gradient w-3/4 -translate-x-1/2 h-1/4 md:h-1/3 inset-0 blur-[5rem] animate-image-glow"></div>
                        <div className="-m-2 rounded-xl p-2 ring-1 ring-inset ring-foreground/20 lg:-m-4 lg:rounded-2xl bg-opacity-50 backdrop-blur-3xl">
                            <BorderBeam size={250} duration={12} delay={9} />
                            <Image
                                src="/assets/dashboard.png"
                                alt="Dashboard"
                                width={1200}
                                height={1200}
                                quality={100}
                                className="rounded-md lg:rounded-xl bg-foreground/10 ring-1 ring-border"
                            />
                            <div className="absolute -bottom-4 inset-x-0 w-full h-1/2 bg-gradient-to-t from-background z-40"></div>
                            <div className="absolute bottom-0 md:-bottom-8 inset-x-0 w-full h-1/4 bg-gradient-to-t from-background z-50"></div>
                        </div>
                    </AnimationContainer>
                )}
            </div>
        </MaxWidthWrapper>
    );
}

export interface SectionIntroProps {
    badge?: string;
    heading?: string;
    subtext?: string;
}

export interface BentoCardText {
    name: string;
    description: string;
    cta: string;
}

export function FeaturesOne({
    badge = "Features",
    heading = "Manage Returns Like a Pro",
    subtext = "Reflow gives your Shopify store its own branded returns portal — your customers help themselves, and you stay in control from one simple admin dashboard.",
    cards,
}: SectionIntroProps & { cards?: BentoCardText[] }) {
    // Card visuals (widgets/illustrations) are fixed and cycle; the text on
    // each card is editable from the page builder.
    const items = cards?.length
        ? cards.map((c, idx) => ({ ...CARDS[idx % CARDS.length], ...c }))
        : CARDS;
    return (
        <MaxWidthWrapper className="pt-10">
            <AnimationContainer delay={0.1}>
                <div id="features" className="flex flex-col w-full items-center lg:items-center justify-center py-8 scroll-mt-24">
                    <MagicBadge title={badge} />
                    <h2 className="text-center lg:text-center text-3xl md:text-5xl !leading-[1.1] font-medium font-heading text-foreground mt-6">
                        {heading}
                    </h2>
                    <p className="mt-4 text-center lg:text-center text-lg text-muted-foreground max-w-lg">
                        {subtext}
                    </p>
                </div>
            </AnimationContainer>
            <AnimationContainer delay={0.2}>
                <BentoGrid className="py-8">
                    {items.map((feature, idx) => (
                        <BentoCard key={idx} {...feature} />
                    ))}
                </BentoGrid>
            </AnimationContainer>
        </MaxWidthWrapper>
    );
}

export interface ProcessStepText {
    title: string;
    description: string;
}

export function ProcessOne({
    badge = "The Process",
    heading = "Effortless returns management in 3 steps",
    subtext = "Follow these simple steps to brand, manage, and track your returns with ease.",
    steps,
}: SectionIntroProps & { steps?: ProcessStepText[] }) {
    const items = steps?.length
        ? steps.map((s, idx) => ({ ...PROCESS[idx % PROCESS.length], ...s }))
        : PROCESS;
    return (
        <MaxWidthWrapper className="py-10">
            <AnimationContainer delay={0.1}>
                <div className="flex flex-col items-center lg:items-center justify-center w-full py-8 max-w-xl mx-auto">
                    <MagicBadge title={badge} />
                    <h2 className="text-center lg:text-center text-3xl md:text-5xl !leading-[1.1] font-medium font-heading text-foreground mt-6">
                        {heading}
                    </h2>
                    <p className="mt-4 text-center lg:text-center text-lg text-muted-foreground max-w-lg">
                        {subtext}
                    </p>
                </div>
            </AnimationContainer>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full py-8 gap-4 md:gap-8">
                {items.map((process, id) => (
                    <AnimationContainer delay={0.2 * id} key={id}>
                        <MagicCard className="group md:py-8">
                            <div className="flex flex-col items-start justify-center w-full">
                                <process.icon strokeWidth={1.5} className="w-10 h-10 text-foreground" />
                                <div className="flex flex-col relative items-start">
                                    <span className="absolute -top-6 right-0 border-2 border-border text-foreground font-medium text-2xl rounded-full w-12 h-12 flex items-center justify-center pt-0.5">
                                        {id + 1}
                                    </span>
                                    <h3 className="text-base mt-6 font-medium text-foreground">
                                        {process.title}
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {process.description}
                                    </p>
                                </div>
                            </div>
                        </MagicCard>
                    </AnimationContainer>
                ))}
            </div>
        </MaxWidthWrapper>
    );
}

export function PricingOne({
    badge = "Simple Pricing",
    heading = "Choose a plan that works for you",
    subtext = "Get started with Reflow today and enjoy more features with our pro plans.",
    note = "No credit card required",
}: SectionIntroProps & { note?: string }) {
    return (
        <MaxWidthWrapper className="py-10">
            <AnimationContainer delay={0.1}>
                <div id="pricing" className="flex flex-col items-center lg:items-center justify-center w-full py-8 max-w-xl mx-auto scroll-mt-24">
                    <MagicBadge title={badge} />
                    <h2 className="text-center lg:text-center text-3xl md:text-5xl !leading-[1.1] font-medium font-heading text-foreground mt-6">
                        {heading}
                    </h2>
                    <p className="mt-4 text-center lg:text-center text-lg text-muted-foreground max-w-lg">
                        {subtext}
                    </p>
                </div>
            </AnimationContainer>
            <AnimationContainer delay={0.2}>
                <PricingCards />
            </AnimationContainer>
            <AnimationContainer delay={0.3}>
                <div className="flex flex-wrap items-start md:items-center justify-center lg:justify-evenly gap-6 mt-12 max-w-5xl mx-auto w-full">
                    <div className="flex items-center gap-2">
                        <CreditCardIcon className="w-5 h-5 text-foreground" />
                        <span className="text-muted-foreground">{note}</span>
                    </div>
                </div>
            </AnimationContainer>
        </MaxWidthWrapper>
    );
}

export interface Review {
    name: string;
    username: string;
    rating: number;
    review: string;
}

function ReviewColumn({ reviews }: { reviews: readonly Review[] }) {
    return (
        <div className="flex flex-col items-start h-min gap-6">
            {reviews.map((review, index) => (
                <AnimationContainer delay={0.2 * index} key={index}>
                    <MagicCard key={index} className="md:p-0">
                        <Card className="flex flex-col w-full border-none h-min">
                            <CardHeader className="space-y-0">
                                <CardTitle className="text-lg font-medium text-muted-foreground">
                                    {review.name}
                                </CardTitle>
                                <CardDescription>{review.username}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pb-4">
                                <p className="text-muted-foreground">{review.review}</p>
                            </CardContent>
                            <CardFooter className="w-full space-x-1 mt-auto">
                                {Array.from({ length: review.rating }, (_, i) => (
                                    <StarIcon key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                ))}
                            </CardFooter>
                        </Card>
                    </MagicCard>
                </AnimationContainer>
            ))}
        </div>
    );
}

export function ReviewsOne({
    badge = "Our Customers",
    heading = "What our users are saying",
    subtext = "Here's what some of our users have to say about Reflow.",
    reviews,
}: SectionIntroProps & { reviews?: Review[] }) {
    const items: readonly Review[] = reviews?.length ? reviews : REVIEWS;
    const third = Math.ceil(items.length / 3);
    return (
        <MaxWidthWrapper className="py-10">
            <AnimationContainer delay={0.1}>
                <div className="flex flex-col items-center lg:items-center justify-center w-full py-8 max-w-xl mx-auto">
                    <MagicBadge title={badge} />
                    <h2 className="text-center lg:text-center text-3xl md:text-5xl !leading-[1.1] font-medium font-heading text-foreground mt-6">
                        {heading}
                    </h2>
                    <p className="mt-4 text-center lg:text-center text-lg text-muted-foreground max-w-lg">
                        {subtext}
                    </p>
                </div>
            </AnimationContainer>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 place-items-start gap-4 md:gap-8 py-10">
                <ReviewColumn reviews={items.slice(0, third)} />
                <ReviewColumn reviews={items.slice(third, third * 2)} />
                <ReviewColumn reviews={items.slice(third * 2)} />
            </div>
        </MaxWidthWrapper>
    );
}

export interface CtaOneProps {
    heading?: string;
    subtext?: string;
    ctaLabel?: string;
    ctaHref?: string;
}

export function CtaOne({
    heading = "Step into the future of returns management",
    subtext = "Experience the cutting-edge solution that transforms how you handle your returns. Elevate your online presence with our next-gen platform.",
    ctaLabel = "Get started for free",
    ctaHref = "/demo",
}: CtaOneProps) {
    return (
        <MaxWidthWrapper className="mt-20 max-w-[100vw] overflow-x-hidden scrollbar-hide">
            <AnimationContainer delay={0.1}>
                <LampContainer>
                    <div className="flex flex-col items-center justify-center relative w-full text-center">
                        <h2 className="bg-gradient-to-b from-neutral-200 to-neutral-400 py-4 bg-clip-text text-center text-4xl md:text-7xl !leading-[1.15] font-medium font-heading tracking-tight text-transparent mt-8">
                            {heading}
                        </h2>
                        <p className="text-muted-foreground mt-6 max-w-md mx-auto">{subtext}</p>
                        <div className="mt-6">
                            <Button asChild>
                                <Link href={ctaHref}>
                                    {ctaLabel}
                                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </LampContainer>
            </AnimationContainer>
        </MaxWidthWrapper>
    );
}
