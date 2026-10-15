import { translate } from "@/lib/translations";
import { DemoLogin } from "@/components/DemoLogin";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const base = { title: "Your Workspace | Qarrini" };
  return { ...base, title: translate(base.title, lang === "fr" ? "fr" : "ar") };
}
export default function LoginPage() {
  return <DemoLogin />;
}
