import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
    title: "Jetmind Brain — AI Intelligence Layer",
    description: "Regulation Knowledge Graph · Safety Intelligence · AI-first compliance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={inter.variable}>
            <body className="bg-[#040608] text-white antialiased">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
