import "./globals.css";

export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="text-sm font-bold text-brand">QARRINI · قرّيني</p>
          <h1 className="text-3xl font-bold text-gray-900">
            الصفحة موش موجودة
          </h1>
          <p lang="fr" className="text-gray-500">
            Cette page est introuvable.
          </p>
          <a
            href="/ar"
            className="rounded-lg bg-brand px-6 py-3 font-bold text-white"
          >
            الرئيسية · Accueil
          </a>
        </main>
      </body>
    </html>
  );
}
