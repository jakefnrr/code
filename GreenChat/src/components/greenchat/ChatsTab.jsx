import React, { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { dmChatId, initials, avatarStyle } from "@/lib/greenchat";

export default function ChatsTab({ me, myProfile, onOpenChat }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadFriends() {
    const page = await base44.entities.Friendship.filter(
      { status: "accepted", $or: [{ from_user_id: me.id }, { to_user_id: me.id }] },
      { sort: "-updated_date", limit: 100 }
    );
    const items = (page.items || []).map((f) => {
      const isFrom = f.from_user_id === me.id;
      return {
        id: f.id,
        userId: isFrom ? f.to_user_id : f.from_user_id,
        username: isFrom ? f.to_username : f.from_username,
      };
    });
    setFriends(items);
    setLoading(false);
  }

  useEffect(() => {
    loadFriends();
    const unsubscribe = base44.entities.Friendship.subscribe((event) => {
      if (!event || !event.data) return;
      if (event.data.status !== "accepted") return;
      loadFriends();
    });
    return unsubscribe;
  }, [me.id]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-4 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Chats</h1>
        <p className="text-sm text-muted-foreground">Pick a friend to start messaging</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && <p className="text-center text-muted-foreground text-sm py-8">Loading…</p>}
        {!loading && friends.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12 px-6">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            No chats yet. Add a friend from the Friends tab to start chatting.
          </div>
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
            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-accent transition-colors text-left border-b border-border/50"
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0"
              style={avatarStyle(undefined)}
            >
              {initials(f.username)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{f.username}</p>
              <p className="text-xs text-muted-foreground">Tap to chat</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}