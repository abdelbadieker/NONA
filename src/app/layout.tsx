import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { cairo, inter } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NONA — متجر نسائي",
    template: "%s | NONA",
  },
  description:
    "NONA — متجر نسائي عصري. لانجري، فساتين، روبات وأحذية مع الدفع عند الاستلام في الجزائر.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
