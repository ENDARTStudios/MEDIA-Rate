"use client";

import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/use-auth-store";
import { useRouter, usePathname } from "next/navigation";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const ts = useTranslations("settings");
  const tn = useTranslations("nav");
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const currentLocale = pathname.split("/")[1] ?? "pt-BR";
  const locales = ["pt-BR", "en-US", "es-ES"];

  return (
    <ProtectedPage>
      <div className="max-w-3xl mx-auto py-16 px-4">
        <h1 className="text-3xl font-heading font-bold text-[#EDE7DC] mb-8">{ts("title")}</h1>

        <div className="space-y-6">
          <div className="bg-[#11111E] rounded-md p-6 border border-[rgba(129,140,248,0.08)]">
            <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-4">
              {ts("account")}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#9CA3AF]">{ts("name")}</span>
                <span className="text-[#EDE7DC]">{user?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9CA3AF]">{ts("email")}</span>
                <span className="text-[#EDE7DC]">{user?.email ?? "—"}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#11111E] rounded-md p-6 border border-[rgba(129,140,248,0.08)]">
            <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-4">
              {ts("language")}
            </h2>
            <p className="text-sm text-[#9CA3AF] mb-3">{ts("languageHint")}</p>
            <div className="flex gap-2">
              {locales.map((loc) => (
                <Button
                  key={loc}
                  variant={currentLocale === loc ? "default" : "outline"}
                  size="sm"
                  onClick={() => router.push(`/${loc}/settings`)}
                >
                  {loc}
                </Button>
              ))}
            </div>
          </div>

          <div className="bg-[#11111E] rounded-md p-6 border border-[rgba(129,140,248,0.08)]">
            <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-4">
              {ts("session")}
            </h2>
            <Button
              variant="destructive"
              onClick={() => {
                logout();
                router.push("/");
              }}
            >
              {tn("logout") ?? ts("session")}
            </Button>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
