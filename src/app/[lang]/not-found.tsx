import { T } from "@/components/I18n";

import Link from "@/components/LocalizedLink";
import { Logo } from "@/components/Logo";
import { primaryButton, secondaryButton } from "@/components/SiteUi";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
      <Logo className="text-4xl" />
      <p className="mt-10 text-sm font-semibold tracking-widest text-brand">
        404
      </p>
      <h1 className="font-display mt-4 text-3xl font-extrabold text-gray-900">
        <T>Let&apos;s find your way back.</T>
      </h1>
      <p className="mt-5 leading-7 text-gray-500">
        <T>
          This page or class could not be found. Explore the teacher directory
          or head back to the homepage.
        </T>
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-4">
        <Link href="/find-a-teacher" className={primaryButton}>
          <T>Find a Teacher</T>
        </Link>
        <Link href="/" className={secondaryButton}>
          <T>Go home</T>
        </Link>
      </div>
    </main>
  );
}
