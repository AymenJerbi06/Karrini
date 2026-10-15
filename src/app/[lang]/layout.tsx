import type { Metadata } from "next";
import {
  Open_Sans,
  Plus_Jakarta_Sans,
  Noto_Sans_Arabic,
} from "next/font/google";
import { notFound } from "next/navigation";
import { I18nProvider } from "@/components/I18n";
import { isLocale } from "@/lib/i18n";
import "../globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Latin wordmark and display face paired with Noto Sans Arabic.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});
const arabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export function generateStaticParams() {
  return [{ lang: "ar" }, { lang: "fr" }];
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return {
    title:
      lang === "fr"
        ? "Karrini | Apprendre, ensemble."
        : "قرّيني | معاك حتى تفهم",
    description:
      lang === "fr"
        ? "Les professeurs de Sfax, des cours interactifs et un accompagnement qui fait la différence. Découvrez Karrini."
        : "أساتذة صفاقس، دروس تفاعلية ومرافقة تقرّبك للفهم. اختار أستاذك وشارك في كل درس مع قرّيني.",
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      data-scroll-behavior="smooth"
      className={`${openSans.variable} ${jakarta.variable} ${arabic.variable}`}
    >
      <body>
        <I18nProvider locale={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
