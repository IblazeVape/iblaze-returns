import { Geist, Kalam } from "next/font/google"

// Fonts for the marketing-three (studio-style) design, shared between
// app/marketing-three/page.tsx and the Puck page-builder blocks.
export const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
export const kalam = Kalam({ weight: "400", subsets: ["latin"], variable: "--font-kalam" })
