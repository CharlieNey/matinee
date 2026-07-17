import { ViewTransition } from "react";
import type { Metadata } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import { LayoutToggle } from "@/components/LayoutToggle";
import { PaperGrain } from "@/components/PaperGrain";
import { Providers } from "@/components/Providers";
import { TimeMachine } from "@/components/TimeMachine";
import { WebNav } from "@/components/WebNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/* House Velvet display face (web mode only — see globals.css §12 rules). */
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Matinee",
  description: "The live board for Broadway rush, lotteries, and cheap seats",
};

/**
 * Stamps html[data-layout] before first paint so mode styling never flashes:
 * the visitor's saved choice, else web on desktop-sized viewports.
 */
const LAYOUT_MODE_SCRIPT = `(function(){try{var m=localStorage.getItem("matinee-layout-v1")||localStorage.getItem("theatr-layout-v1");if(m!=="web"&&m!=="mobile"){m=matchMedia("(min-width:1024px)").matches?"web":"mobile"}document.documentElement.setAttribute("data-layout",m)}catch(e){document.documentElement.setAttribute("data-layout","mobile")}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the pre-paint script stamps data-layout on
    // html before React hydrates, which React would otherwise flag.
    <html
      lang="en"
      className={`${geistSans.variable} ${playfair.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: LAYOUT_MODE_SCRIPT }} />
        <PaperGrain />
        <Providers>
          <WebNav />
          {/* Mobile mode: single centered phone column, hairline edges on
              desktop. Web mode: pages set their own width (DESIGN.md §10).
              ViewTransition: every navigation crossfades the page shell;
              named posters morph above it (globals.css). */}
          <ViewTransition default="page-cross">
            <div className="relative mx-auto min-h-dvh max-w-[430px] sm:border-x sm:border-line web:max-w-none web:border-x-0">
              {children}
            </div>
          </ViewTransition>
          <LayoutToggle />
          <TimeMachine />
        </Providers>
      </body>
    </html>
  );
}
