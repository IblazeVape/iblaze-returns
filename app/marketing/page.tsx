import Navbar from "@/components/marketing/navbar";
import Footer from "@/components/marketing/footer";
import {
    CtaOne,
    FeaturesOne,
    HeroOne,
    PricingOne,
    ProcessOne,
    ReviewsOne,
} from "@/components/marketing/sections";
import { aeonik, inter } from "@/lib/marketing-fonts";
import { cn } from "@/lib/utils";

// Port of linkify/src/app/(marketing)/page.tsx + layout.tsx, adapted to the
// returns product. Same sections, same order, same markup — the section JSX
// lives in components/marketing/sections.tsx so the Puck page builder can
// reuse it as blocks.
const MarketingPage = () => {
    return (
        <div
            id="marketing-root"
            className={cn(
                "min-h-[100dvh] bg-background text-foreground font-default overflow-x-hidden scrollbar-hide",
                aeonik.variable,
                inter.variable,
            )}
        >
            <div id="home" className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full" />
            <Navbar />
            <main className="mt-20 mx-auto w-full z-0 relative">
                <HeroOne />
                <FeaturesOne />
                <ProcessOne />
                <PricingOne />
                <ReviewsOne />
                <CtaOne />
            </main>
            <Footer />
        </div>
    );
};

export default MarketingPage
