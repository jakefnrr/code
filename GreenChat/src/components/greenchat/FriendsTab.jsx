import React, { useEffect, useState } from "react";
import { Search, UserPlus, MessageCircle, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { dmChatId, initials, avatarStyle } from "@/lib/greenchat";

export default function FriendsTab({ me, myProfile, onOpenChat }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [friendships, setFriendships] = useState([]);
  const [busy, setBusy] = useState(null);

  async function loadFriendships() {
    const page = await base44.entities.Friendship.filter(
      { $or: [{ from_user_id: me.id }, { to_user_id: me.id }] },
      { sort: "-created_date", limit: 200 }
    );
    setFriendships(page.items || []);
  }

  useEffect(() => {
    loadFriendships();
    const unsubscribe = base44.entities.Friendship.subscribe(() => loadFriendships());
    return unsubscribe;
  }, [me.id]);

  // Debounced search by username.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const page = await base44.entities.UserProfile.filter(
          { username: { $regex: q, $options: "i" } },
          { limit: 12 }
        );
        if (active) setResults((page.items || []).filter((r) => r.user_id !== me.id));
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, me.id]);

  const friendIds = new Set();
  const sentToIds = new Set();
  friendships.forEach((f) => {
    const other = f.from_user_id === me.id ? f.to_user_id : f.from_user_id;
    if (f.status === "accepted") friendIds.add(other);
    if (f.status === "pending" && f.from_user_id === me.id) sentToIds.add(other);
  });

  const friends = friendships
    .filter((f) => f.status === "accepted")
    .map((f) => ({
      id: f.id,
      userId: f.from_user_id === me.id ? f.to_user_id : f.from_user_id,
      username: f.from_user_id === me.id ? f.to_username : f.from_username,
    }));

  const sent = friendships.filter((f) => f.status === "pending" && f.from_user_id === me.id);

  async function sendRequest(r) {
    setBusy(r.id);
    try {
      await base44.entities.Friendship.create({
        from_user_id: me.id,
        from_username: myProfile.username,
        to_user_id: r.user_id,
        to_username: r.username,
        status: "pending",
      });
      await loadFriendships();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-4 border-b border-border">
        <h1 className="text-xl font-bold text-foreground mb-3">Friends</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username…"
            className="w-full bg-card text-foreground placeholder:text-muted-foreground rounded-full pl-10 pr-4 py-2.5 outline-none border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search results */}
        {query.trim() && (
          <div className="px-5 pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {searching ? "Searching…" : "Results"}
            </p>
            {results.length === 0 && !searching && (
              <p className="text-sm text-muted-foreground py-4">No users found.</p>
            )}
            {results.map((r) => {
              const isFriend = friendIds.has(r.user_id);
              const sentReq = sentToIds.has(r.user_id);
              return (
                <div key={r.id} className="flex items-center gap-3 py-2.5">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                    style={avatarStyle(r.avatar_color)}
                  >
                    {initials(r.username)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{r.username}</p>
                    {r.display_name && (
                      <p className="text-xs text-muted-foreground truncate">{r.display_name}</p>
                    )}
                  </div>
                  {isFriend ? (
                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                      <Check className="w-4 h-4" /> Friends
                    </span>
                  ) : sentReq ? (
                    <span className="text-xs text-muted-foreground">Request sent</span>
                  ) : (
                    <button
                      onClick={() => sendRequest(r)}
                      disabled={busy === r.id}
                      className="flex items-center gap-1.5 text-sm font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-full hover:brightness-110 transition-all disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4" /> Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Friends list */}
        <div className="px-5 pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Your friends ({friends.length})
          </p>
          {friends.length === 0 && !query.trim() && (
            <p className="text-sm text-muted-foreground py-2">
              No friends yet. Search above to find people.
            </p>
          )}
          {friends.map((f) => (
            <button
              key={f.id}
              onClick={() =>
                onOpenChat({
                  chat_id: dmChatId(me.id, f.userId),
                  title: f.username,
                  participants: [me.id, f.userId],
                })
              }
              className="w-full flex items-center gap-3 py-2.5 hover:bg-accent rounded-lg px-2 -mx-2 transition-colors text-left"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                style={avatarStyle(undefined)}
              >
                {initials(f.username)}
              </div>
              <p className="font-semibold text-foreground flex-1 truncate">{f.username}</p>
              <MessageCircle className="w-5 h-5 text-primary" />
            </button>
          ))}
        </div>

        {/* Sent requests */}
        {sent.length > 0 && (
          <div className="px-5 pt-4 pb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Sent requests ({sent.length})
            </p>
            {sent.map((f) => (
              <div key={f.id} className="flex items-center gap-3 py-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={avatarStyle(undefined)}
                >
                  {initials(f.to_username)}
                </div>
                <p className="font-medium text-foreground flex-1 truncate">{f.to_username}</p>
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}