import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "B28 Entertainment | Stream Movies & Series",
  description:
    "Stream Kenyan films and B28 Entertainment originals. Drama, action, thriller, and more.",
  openGraph: {
    title: "B28 Entertainment",
    description: "Stream Kenyan films and B28 Entertainment originals.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen`}>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
