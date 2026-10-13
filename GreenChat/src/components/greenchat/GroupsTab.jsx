import React, { useEffect, useState } from "react";
import { Plus, Users, Search, UserPlus, MessageCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { initials, avatarStyle } from "@/lib/greenchat";

export default function GroupsTab({ me, myProfile, onOpenChat }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [showAddFor, setShowAddFor] = useState(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState([]);

  async function load() {
    const page = await base44.entities.Group.filter({}, { sort: "-created_date", limit: 100 });
    setGroups(page.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const unsubscribe = base44.entities.Group.subscribe(() => load());
    return unsubscribe;
  }, [me.id]);

  async function createGroup(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await base44.entities.Group.create({
        name: trimmed,
        owner_id: me.id,
        members: [me.id],
        member_usernames: [myProfile.username],
      });
      setName("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  // Search users to add as members.
  useEffect(() => {
    const q = memberQuery.trim();
    if (!q) {
      setMemberResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const page = await base44.entities.UserProfile.filter(
        { username: { $regex: q, $options: "i" } },
        { limit: 8 }
      );
      setMemberResults((page.items || []).filter((r) => r.user_id !== me.id));
    }, 300);
    return () => clearTimeout(t);
  }, [memberQuery, me.id]);

  async function addMember(group, profile) {
    if (group.members.includes(profile.user_id)) return;
    await base44.entities.Group.update(group.id, {
      members: [...group.members, profile.user_id],
      member_usernames: [...group.member_usernames, profile.username],
    });
    setMemberQuery("");
    setShowAddFor(null);
    await load();
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-4 border-b border-border">
        <h1 className="text-xl font-bold text-foreground mb-3">Groups</h1>
        <form onSubmit={createGroup} className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New group name…"
            className="flex-1 bg-card text-foreground placeholder:text-muted-foreground rounded-full px-4 py-2.5 outline-none border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="flex items-center gap-1.5 text-sm font-medium bg-primary text-primary-foreground px-4 py-2.5 rounded-full hover:brightness-110 transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="text-center text-muted-foreground text-sm py-8">Loading…</p>}
        {!loading && groups.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12 px-6">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            No groups yet. Create one above to start a group chat.
          </div>
        )}

        {groups.map((g) => {
          const isOwner = g.owner_id === me.id;
          const open = () =>
            onOpenChat({
              chat_id: "group_" + g.id,
              title: g.name,
              subtitle: (g.member_usernames || []).join(", "),
              participants: g.members,
            });
          return (
            <div key={g.id} className="px-5 py-3 border-b border-border/50">
              <div className="flex items-center gap-3">
                <button
                  onClick={open}
                  className="w-11 h-11 rounded-xl bg-accent text-primary flex items-center justify-center shrink-0 hover:brightness-110 transition-all"
                >
                  <Users className="w-6 h-6" />
                </button>
                <button onClick={open} className="min-w-0 flex-1 text-left">
                  <p className="font-semibold text-foreground truncate">{g.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {(g.members || []).length} members
                  </p>
                </button>
                <button
                  onClick={open}
                  className="w-9 h-9 rounded-full text-primary flex items-center justify-center hover:bg-accent transition-colors"
                  aria-label="Open group chat"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                {isOwner && (
                  <button
                    onClick={() => {
                      setShowAddFor(showAddFor === g.id ? null : g.id);
                      setMemberQuery("");
                    }}
                    className="w-9 h-9 rounded-full text-muted-foreground flex items-center justify-center hover:bg-accent hover:text-primary transition-colors"
                    aria-label="Add member"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                )}
              </div>

              {showAddFor === g.id && (
                <div className="mt-3 ml-14 bg-card border border-border rounded-xl p-3">
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      value={memberQuery}
                      onChange={(e) => setMemberQuery(e.target.value)}
                      placeholder="Search username to add…"
                      className="w-full bg-background text-foreground placeholder:text-muted-foreground rounded-lg pl-9 pr-3 py-2 outline-none border border-border focus:border-primary text-sm"
                    />
                  </div>
                  {memberResults.map((r) => {
                    const already = (g.members || []).includes(r.user_id);
                    return (
                      <button
                        key={r.id}
                        onClick={() => addMember(g, r)}
                        disabled={already}
                        className="w-full flex items-center gap-2 py-1.5 px-1 hover:bg-accent rounded-lg transition-colors text-left disabled:opacity-50"
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={avatarStyle(r.avatar_color)}
                        >
                          {initials(r.username)}
                        </div>
                        <span className="text-sm text-foreground flex-1 truncate">{r.username}</span>
                        {already ? (
                          <span className="text-xs text-muted-foreground">In group</span>
                        ) : (
                          <Plus className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}