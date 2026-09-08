import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import "./workspace.css";

export const metadata: Metadata = {
  title: "NC Municipal Finance Explorer",
  icons: { icon: "/nc-mark.svg", shortcut: "/nc-mark.svg" },
  description: "Compare taxes, spending, budgets, debt, and financial trends across North Carolina municipalities.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
