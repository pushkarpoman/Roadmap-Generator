import type { Metadata } from "next";
import { AppProvider } from "@/context/app-context";
import { AuthGate } from "@/components/AuthGate";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roadmap Generator",
  description: "Generate AI-powered career roadmaps",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <div className="app dark-theme">
            <div className="background-gradient" />
            <Navbar />
            <div className="content-wrapper">
              <AuthGate>{children}</AuthGate>
            </div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
