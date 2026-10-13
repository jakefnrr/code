import React from "react";
import { LogOut, MessageCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SettingsTab({ me, myProfile }) {
  async function handleLogout() {
    await base44.auth.logout();
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
      </div>

      <div className="px-5 py-6 max-w-md space-y-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">Signed in as</p>
          <p className="font-semibold text-foreground">{myProfile?.username || me.email}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{me.email}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="w-4 h-4 text-primary" />
            <p className="font-semibold text-foreground">About GreenChat</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time chat that works across the world. Search a username, send a friend
            request, and start talking instantly.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-destructive text-destructive-foreground font-semibold py-2.5 rounded-lg hover:brightness-110 transition-all"
        >
          <LogOut className="w-5 h-5" /> Log out
        </button>
      </div>
    </div>
  );
}