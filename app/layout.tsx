import type { Metadata } from "next";
import { Noto_Sans_Thai, Geist_Mono, Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yokayaki Izakaya POS",
  description: "ระบบบริหารจัดการร้านอาหารญี่ปุ่นและระบบสั่งอาหารไฮบริด Yokayaki Izakaya Point of Sale",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={cn("h-full", "antialiased", notoSansThai.variable, geistMono.variable, geist.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground antialiased leading-relaxed">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
