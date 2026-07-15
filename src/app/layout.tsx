import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Theatr",
  description: "The theatre ticket marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        {/* Phone product: single centered column, hairline edges on desktop */}
        <Providers>
          <div className="relative mx-auto min-h-dvh max-w-[430px] sm:border-x sm:border-line">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
