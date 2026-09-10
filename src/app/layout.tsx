import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/toast-provider";
import "./globals.css";
import "./toast.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "HeySage Admin",
    template: "%s · HeySage Admin",
  },
  description: "Internal admin panel for HeySage.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full bg-background font-sans text-foreground"
        suppressHydrationWarning
      >
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
