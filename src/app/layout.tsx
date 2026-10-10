import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoNester | Garment Nesting Studio",
  description: "CAD-aware fabric nesting, geometry optimization and diagnostic preview workspace.",
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="en"><body className="min-h-full">{children}</body></html>
  );
}
