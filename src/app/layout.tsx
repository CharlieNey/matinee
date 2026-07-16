import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { LayoutToggle } from "@/components/LayoutToggle";
import { Providers } from "@/components/Providers";
import { WebNav } from "@/components/WebNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Theatr",
  description: "The theatre ticket marketplace",
};

/**
 * Stamps html[data-layout] before first paint so mode styling never flashes:
 * the visitor's saved choice, else web on desktop-sized viewports.
 */
const LAYOUT_MODE_SCRIPT = `(function(){try{var m=localStorage.getItem("theatr-layout-v1");if(m!=="web"&&m!=="mobile"){m=matchMedia("(min-width:1024px)").matches?"web":"mobile"}document.documentElement.setAttribute("data-layout",m)}catch(e){document.documentElement.setAttribute("data-layout","mobile")}})()`;

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
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: LAYOUT_MODE_SCRIPT }} />
        <Providers>
          <WebNav />
          {/* Mobile mode: single centered phone column, hairline edges on
              desktop. Web mode: pages set their own width (DESIGN.md §10). */}
          <div className="relative mx-auto min-h-dvh max-w-[430px] sm:border-x sm:border-line web:max-w-none web:border-x-0">
            {children}
          </div>
          <LayoutToggle />
        </Providers>
      </body>
    </html>
  );
}
