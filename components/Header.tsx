"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert, Settings, Bell } from "lucide-react";

interface Props {
  dangerCount: number;
}

export default function Header({ dangerCount }: Props) {
  const pathname = usePathname();
  const onSettingsPage = pathname === "/settings";

  return (
    <div className="bg-slate-900 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-lg">
            <ShieldAlert size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">CERT Ad Monitor</h1>
            <p className="text-xs text-slate-400">Meta Ad Library Fraud Detection</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {dangerCount > 0 && (
            <span className="relative flex items-center">
              <Bell size={18} className="text-red-400" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {dangerCount}
              </span>
            </span>
          )}
          <Link
            href="/settings"
            className={`p-2 rounded-lg transition-colors ${
              onSettingsPage
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Settings size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
