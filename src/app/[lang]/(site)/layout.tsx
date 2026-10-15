import { T } from "@/components/I18n";

import { ChatLauncher } from "@/components/ChatLauncher";
import { Footer } from "@/components/sections/Footer";
import { Header } from "@/components/sections/Header";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only fixed top-3 left-3 z-[100] rounded-md bg-white px-5 py-3 font-semibold text-blue-700 shadow-lg focus:not-sr-only"
      >
        <T>Skip to content</T>
      </a>
      <Header />
      <main id="main-content">
        <T>{children}</T>
      </main>
      <Footer />
      <ChatLauncher />
    </>
  );
}
