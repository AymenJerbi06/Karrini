import { translate } from "@/lib/translations";
import { AccountSettings } from "@/components/workspace/AccountSettings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return { title: translate("Account settings | Karrini", lang === "fr" ? "fr" : "ar") };
}
export default function Page() {
  return <AccountSettings />;
}
