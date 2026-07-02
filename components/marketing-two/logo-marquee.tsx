import Image from "next/image"

// Grayscale logo marquee. Uses the same MIT-licensed logo assets already
// vendored in /public/assets (from the Linkify port).
const LOGOS = [
  "/assets/company-01.svg",
  "/assets/company-02.svg",
  "/assets/company-03.svg",
  "/assets/company-04.svg",
  "/assets/company-05.svg",
  "/assets/company-06.svg",
]

export function LogoMarqueeTwo() {
  return (
    <section className="py-14">
      <p className="text-center text-muted-foreground">
        Trusted by startups, enterprises, and industry giants alike.
      </p>
      <div className="relative mt-9 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
        <div
          className="flex w-max animate-marquee items-center gap-16 pr-16 grayscale opacity-70"
          style={{ "--duration": "34s", "--gap": "4rem" } as React.CSSProperties}
        >
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <Image key={i} src={logo} alt="Customer logo" width={112} height={36} className="h-8 w-auto invert" />
          ))}
        </div>
      </div>
    </section>
  )
}
