import Link from "next/link"
import { AnimationContainer } from "@/components/marketing/animation-container"
import { TextHoverEffect } from "@/components/marketing/text-hover-effect"

export function Footer() {
  return (
    <footer className="relative mx-auto flex w-full max-w-6xl flex-col items-center justify-center border-t border-white/10 bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/8%),transparent)] px-6 pb-8 pt-16 lg:px-8 lg:pt-32">
      <div className="absolute left-1/2 right-1/2 top-0 h-1.5 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />

      <div className="grid w-full gap-8 xl:grid-cols-3 xl:gap-8">
        <AnimationContainer delay={0.1}>
          <div className="flex flex-col items-start justify-start md:max-w-[200px]">
            <span className="text-lg font-bold !leading-none">Reflow</span>
            <p className="mt-4 text-start text-sm text-muted-foreground">
              White-label returns for growing Shopify stores.
            </p>
          </div>
        </AnimationContainer>

        <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
          <div className="md:grid md:grid-cols-2 md:gap-8">
            <AnimationContainer delay={0.2}>
              <div>
                <h3 className="text-base font-medium text-white">Product</h3>
                <ul className="mt-4 text-sm text-muted-foreground">
                  <li className="mt-2"><a href="#features" className="transition-all duration-300 hover:text-foreground">Features</a></li>
                  <li className="mt-2"><a href="#pricing" className="transition-all duration-300 hover:text-foreground">Pricing</a></li>
                  <li className="mt-2"><a href="#faq" className="transition-all duration-300 hover:text-foreground">FAQ</a></li>
                  <li className="mt-2"><a href="#admin" className="transition-all duration-300 hover:text-foreground">Admin panel</a></li>
                </ul>
              </div>
            </AnimationContainer>
            <AnimationContainer delay={0.3}>
              <div className="mt-10 flex flex-col md:mt-0">
                <h3 className="text-base font-medium text-white">Platform</h3>
                <ul className="mt-4 text-sm text-muted-foreground">
                  <li><span className="cursor-default">Shopify</span></li>
                  <li className="mt-2"><span className="cursor-default">Clerk</span></li>
                  <li className="mt-2"><span className="cursor-default">Stripe</span></li>
                </ul>
              </div>
            </AnimationContainer>
          </div>
          <div className="md:grid md:grid-cols-2 md:gap-8">
            <AnimationContainer delay={0.4}>
              <div>
                <h3 className="text-base font-medium text-white">Resources</h3>
                <ul className="mt-4 text-sm text-muted-foreground">
                  <li className="mt-2"><Link href="/demo" className="transition-all duration-300 hover:text-foreground">Live demo</Link></li>
                  <li className="mt-2"><Link href="/contact" className="transition-all duration-300 hover:text-foreground">Support</Link></li>
                </ul>
              </div>
            </AnimationContainer>
            <AnimationContainer delay={0.5}>
              <div className="mt-10 flex flex-col md:mt-0">
                <h3 className="text-base font-medium text-white">Company</h3>
                <ul className="mt-4 text-sm text-muted-foreground">
                  <li><Link href="/about" className="transition-all duration-300 hover:text-foreground">About</Link></li>
                  <li className="mt-2"><Link href="/privacy" className="transition-all duration-300 hover:text-foreground">Privacy Policy</Link></li>
                  <li className="mt-2"><Link href="/terms" className="transition-all duration-300 hover:text-foreground">Terms &amp; Conditions</Link></li>
                </ul>
              </div>
            </AnimationContainer>
          </div>
        </div>
      </div>

      <div className="mt-8 w-full border-t border-white/10 pt-4 md:flex md:items-center md:justify-between md:pt-8">
        <AnimationContainer delay={0.6}>
          <p className="mt-8 text-sm text-muted-foreground md:mt-0">
            &copy; {new Date().getFullYear()} Reflow Inc. All rights reserved.
          </p>
        </AnimationContainer>
      </div>

      <div className="hidden h-[20rem] items-center justify-center md:flex">
        <TextHoverEffect text="REFLOW" />
      </div>
    </footer>
  )
}
