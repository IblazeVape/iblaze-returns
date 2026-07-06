import { MarketingTwoThemeProvider } from "@/components/marketing-two/theme-provider"
import { MarketingFourNav } from "@/components/marketing-four/nav"
import { SiteFooter } from "@/components/marketing-four/site-footer"

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingTwoThemeProvider>
      <MarketingFourNav />
      {children}
      <SiteFooter />
    </MarketingTwoThemeProvider>
  )
}
