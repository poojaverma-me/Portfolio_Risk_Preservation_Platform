import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/shell/Shell";

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex" });
const plexCond = IBM_Plex_Sans_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-plex-cond" });
const jb = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-jb" });

// Applies the saved (or system) colour mode before first paint to avoid a flash.
const THEME_BOOT = `try{var t=JSON.parse(localStorage.getItem("bastion-v1")||"{}").state;t=t&&t.theme;if(!t)t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  title: "Bastion · Capital Preservation Intelligence",
  description: "Event-driven portfolio risk detection with traceable LLM + Jev reasoning.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plex.variable} ${plexCond.variable} ${jb.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
