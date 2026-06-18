import { Cairo, Inter } from "next/font/google";

/** Arabic UI font (also covers Latin). Used when lang = ar. */
export const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

/** Latin UI font. Used when lang = fr / en. */
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** Both font CSS variables, applied together on <html>. */
export const fontVariables = `${cairo.variable} ${inter.variable}`;
