import AppLayout from "@/components/layout/AppLayout/AppLayout";
import { AuthProvider } from "@/config/context/AuthContext";
import { TaskCheckProvider } from "@/config/context/TaskCheckContext";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../assets/styles/globals.css";
import "../styles/highlights.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://checkmateai.ru";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CheckMate — AI-проверка заданий ЕГЭ по английскому",
    template: "%s | CheckMate",
  },
  description:
    "CheckMate — сервис на основе искусственного интеллекта для мгновенной проверки заданий 37 и 38 ЕГЭ по английскому языку. Получайте подробный разбор по критериям и улучшайте результаты.",
  keywords: [
    "ЕГЭ английский",
    "проверка эссе ЕГЭ",
    "задание 37 ЕГЭ",
    "задание 38 ЕГЭ",
    "AI проверка ЕГЭ",
    "письмо ЕГЭ английский",
    "подготовка к ЕГЭ",
    "CheckMate",
    "проверка заданий по английскому",
  ],
  authors: [{ name: "CheckMate" }],
  creator: "CheckMate",
  publisher: "CheckMate",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: SITE_URL,
    siteName: "CheckMate",
    title: "CheckMate — AI-проверка заданий ЕГЭ по английскому",
    description:
      "Мгновенная проверка заданий 37 и 38 ЕГЭ по английскому языку с подробным разбором по критериям. Powered by AI.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CheckMate — AI-проверка ЕГЭ по английскому",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CheckMate — AI-проверка заданий ЕГЭ по английскому",
    description:
      "Мгновенная проверка заданий 37 и 38 ЕГЭ по английскому языку с подробным разбором по критериям.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon.svg",
  },
  category: "education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {/* Top.Mail.Ru counter */}
        <script
          dangerouslySetInnerHTML={{
            __html: `var _tmr = window._tmr || (window._tmr = []); _tmr.push({id: "3755767", type: "pageView", start: (new Date()).getTime()}); (function (d, w, id) { if (d.getElementById(id)) return; var ts = d.createElement("script"); ts.type = "text/javascript"; ts.async = true; ts.id = id; ts.src = "https://top-fwz1.mail.ru/js/code.js"; var f = function () {var s = d.getElementsByTagName("script")[0]; s.parentNode.insertBefore(ts, s);}; if (w.opera == "[object Opera]") { d.addEventListener("DOMContentLoaded", f, false); } else { f(); } })(document, window, "tmr-code");`,
          }}
        />
        <noscript>
          <div>
            <img src="https://top-fwz1.mail.ru/counter?id=3755767;js=na" style={{position:"absolute",left:"-9999px"}} alt="Top.Mail.Ru" />
          </div>
        </noscript>
        <AuthProvider>
          <TaskCheckProvider>
            <AppLayout>{children}</AppLayout>
          </TaskCheckProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
