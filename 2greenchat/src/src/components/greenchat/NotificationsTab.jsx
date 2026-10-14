import React, { useEffect, useState } from "react";
import { Check, X, Bell } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { initials, avatarStyle } from "@/lib/greenchat";

export default function NotificationsTab({ me }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  async function load() {
    const page = await base44.entities.Friendship.filter(
      { to_user_id: me.id, status: "pending" },
      { sort: "-created_date", limit: 100 }
    );
    setRequests(page.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const unsubscribe = base44.entities.Friendship.subscribe((event) => {
      if (!event || !event.data) return;
      if (event.data.to_user_id !== me.id) return;
      load();
    });
    return unsubscribe;
  }, [me.id]);

  async function accept(f) {
    setBusy(f.id);
    try {
      await base44.entities.Friendship.update(f.id, { status: "accepted" });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function decline(f) {
    setBusy(f.id);
    try {
      await base44.entities.Friendship.delete(f.id);
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-4 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Notifications</h1>
        <p className="text-sm text-muted-foreground">Friend requests sent to you</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && <p className="text-center text-muted-foreground text-sm py-8">Loading…</p>}
        {!loading && requests.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12 px-6">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
            You're all caught up. No new notifications.
          </div>
        )}
        {requests.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50"
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0"
              style={avatarStyle(undefined)}
            >
              {initials(f.from_username)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">
                {f.from_username}
              </p>
              <p className="text-xs text-muted-foreground">wants to be your friend</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => accept(f)}
                disabled={busy === f.id}
                className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-50"
                aria-label="Accept"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => decline(f)}
                disabled={busy === f.id}
                className="w-9 h-9 rounded-full bg-card border border-border text-muted-foreground flex items-center justify-center hover:text-destructive hover:border-destructive transition-all disabled:opacity-50"
                aria-label="Decline"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}