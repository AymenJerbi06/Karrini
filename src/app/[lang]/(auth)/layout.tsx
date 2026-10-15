import { T } from "@/components/I18n";
import Link from "@/components/LocalizedLink";
import { Logo } from "@/components/Logo";
import { LessonPreview } from "@/components/mockups/HomeVisuals";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="flex min-h-20 items-center justify-between gap-4 border-b border-gray-100 px-5 md:px-10">
        <Link aria-label="Qarrini home" href="/">
          <Logo className="text-[30px]" />
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="grid min-h-[calc(100vh-80px)] lg:grid-cols-2">
        <div className="px-6 py-10 md:py-14">
          <div className="mx-auto max-w-md">
            <T>{children}</T>
            <Link
              href="/"
              className="mt-8 inline-flex min-h-11 items-center text-sm text-gray-500 underline underline-offset-4"
            >
              <T>Back to Qarrini</T>
            </Link>
          </div>
        </div>
        <aside className="hidden items-center justify-center bg-gray-50 px-14 lg:flex">
          <div className="w-full max-w-lg">
            <h2 className="home-heading font-display text-4xl font-extrabold text-gray-900">
              <T>Learning, together.</T>
            </h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-gray-500">
              <T>Your teacher, your lessons and your next step forward.</T>
            </p>
            <div className="mt-12">
              <LessonPreview />
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
