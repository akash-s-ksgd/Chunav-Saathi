import "./globals.css";
import { Providers } from "./providers";
import { LanguageProvider } from "@/context/LanguageContext";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "Chunav Saathi | Independent Election Information",
  description:
    "Chunav Saathi is an independent student project with election information, voter-service links, timelines, and an AI assistant. It is not affiliated with the Election Commission of India.",
  keywords:
    "Election Commission India, voter registration, EPIC card, Form 6, vote, ECI, election 2024, Chunav Saathi",
  openGraph: {
    title: "Chunav Saathi | Independent Election Information",
    description:
      "An independent student project with election information, official-service links, timelines, and voter tools.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <LanguageProvider>
            <Navbar />
            <main>{children}</main>
          </LanguageProvider>
        </Providers>
      </body>
    </html>
  );
}
