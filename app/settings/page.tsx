"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import SettingsPanel, { type HealthModel } from "@/components/SettingsPanel";

export default function SettingsPage() {
  const router = useRouter();
  const [health, setHealth] = useState<HealthModel | null>(null);

  const refreshHealth = async (): Promise<void> => {
    const res = await fetch("/api/health", { cache: "no-store" });
    const data = (await res.json()) as HealthModel;
    setHealth(data);
  };

  useEffect(() => {
    void refreshHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      <Header dangerCount={0} />
      <div className="mx-auto max-w-7xl px-4 py-16">
        <SettingsPanel
          health={health}
          onRefresh={refreshHealth}
          onClose={() => router.push("/")}
        />
      </div>
    </div>
  );
}
