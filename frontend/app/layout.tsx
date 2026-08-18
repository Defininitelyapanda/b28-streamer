import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/lib/auth-context";
import { AuthSessionProvider } from "@/lib/session-provider";

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} flex min-h-screen flex-col`} suppressHydrationWarning>
        <AuthSessionProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </AuthProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
