import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getLang } from "@/lib/i18n/get-lang";
import { Navbar } from "@/components/navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const lang = await getLang();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={session.user} lang={lang} />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
