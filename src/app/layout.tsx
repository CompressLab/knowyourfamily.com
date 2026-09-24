import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FamilyTree — Know, Connect, Trust",
    template: "%s | FamilyTree",
  },
  description:
    "Manage family relationships, securely store important documents, and connect with trusted people.",
  keywords: ["family tree", "family relationships", "secure documents", "family profiles"],
  robots: {
    index: false, // MVP — not for public indexing
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#f59e0b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              borderRadius: "12px",
              border: "1px solid rgb(231,229,228)",
            },
          }}
        />
      </body>
    </html>
  );
}
