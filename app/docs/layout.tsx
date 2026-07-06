import { MarketingTwoThemeProvider } from "@/components/marketing-two/theme-provider"
import { MarketingFourNav } from "@/components/marketing-four/nav"
import { MarketingFourFooter } from "@/components/marketing-four/footer"

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingTwoThemeProvider>
      <MarketingFourNav />
      {children}
      <MarketingFourFooter />
    </MarketingTwoThemeProvider>
  )
}
