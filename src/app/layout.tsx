import type { Metadata } from "next";
import { Roboto, Geist_Mono } from "next/font/google";
import { ListingsProvider } from "@/lib/listings-store";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marketplace · Buy and Sell Locally",
  description:
    "Discover local deals, browse categories, and list items for sale on Marketplace.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#F0F2F5] font-sans text-[#050505]">
        <ListingsProvider>{children}</ListingsProvider>
      </body>
    </html>
  );
}
