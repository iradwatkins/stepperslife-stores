import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { CartProvider } from "@/contexts/CartContext";
import { ShoppingCart } from "@/components/ShoppingCart";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  fallback: ["system-ui", "arial"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  fallback: ["ui-monospace", "monospace"],
});

export const metadata: Metadata = {
  title: "SteppersLife Marketplace - Shop Local Vendors",
  description:
    "Shop from local vendors, discover unique products, and support small businesses.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-light-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-light-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-light-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-light-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SteppersLife Marketplace",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#DC2626",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
          forcedTheme={undefined}
        >
          <ConvexClientProvider>
            <CartProvider>
              <main id="main-content">{children}</main>
              <ShoppingCart />
              <MobileBottomNav />
              <Toaster position="top-right" richColors closeButton />
            </CartProvider>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
