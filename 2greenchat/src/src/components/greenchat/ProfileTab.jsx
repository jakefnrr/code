import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { randomHue, initials, avatarStyle } from "@/lib/greenchat";

export default function ProfileTab({ me, myProfile, onSaved }) {
  const isCreate = !myProfile;
  const [username, setUsername] = useState(myProfile?.username || "");
  const [display_name, setDisplayName] = useState(myProfile?.display_name || "");
  const [bio, setBio] = useState(myProfile?.bio || "");
  const [avatar_color, setAvatarColor] = useState(myProfile?.avatar_color || randomHue());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    const u = username.trim();
    if (!u) {
      setError("Username is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // Uniqueness check (case-insensitive).
      const existing = await base44.entities.UserProfile.filter(
        { username: { $regex: "^" + u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", $options: "i" } },
        { limit: 1 }
      );
      const clash = (existing.items || []).find((p) => p.user_id !== me.id);
      if (clash) {
        setError("That username is taken.");
        setSaving(false);
        return;
      }

      if (isCreate) {
        await base44.entities.UserProfile.create({
          user_id: me.id,
          username: u,
          display_name: display_name.trim(),
          bio: bio.trim(),
          avatar_color,
        });
      } else {
        await base44.entities.UserProfile.update(myProfile.id, {
          username: u,
          display_name: display_name.trim(),
          bio: bio.trim(),
          avatar_color,
        });
      }
      onSaved?.();
    } catch (err) {
      setError(err?.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">
          {isCreate ? "Create your profile" : "Profile"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isCreate
            ? "Pick a username so people can find and add you."
            : "Update your details anytime."}
        </p>
      </div>

      <form onSubmit={handleSave} className="px-5 py-6 max-w-md">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0"
            style={avatarStyle(avatar_color)}
          >
            {initials(display_name || username)}
          </div>
          <button
            type="button"
            onClick={() => setAvatarColor(randomHue())}
            className="text-sm font-medium text-primary hover:underline"
          >
            Change color
          </button>
        </div>

        <label className="block text-sm font-medium text-foreground mb-1">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. greenleaf"
          className="w-full bg-card text-foreground placeholder:text-muted-foreground rounded-lg px-4 py-2.5 mb-4 outline-none border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />

        <label className="block text-sm font-medium text-foreground mb-1">Display name</label>
        <input
          value={display_name}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Optional"
          className="w-full bg-card text-foreground placeholder:text-muted-foreground rounded-lg px-4 py-2.5 mb-4 outline-none border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />

        <label className="block text-sm font-medium text-foreground mb-1">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell people a bit about yourself"
          rows={3}
          className="w-full bg-card text-foreground placeholder:text-muted-foreground rounded-lg px-4 py-2.5 mb-4 outline-none border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
        />

        {error && <p className="text-sm text-destructive mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving || !username.trim()}
          className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
        >
          {saving ? "Saving…" : isCreate ? "Create profile" : "Save changes"}
        </button>
      </form>
    </div>
  );
}