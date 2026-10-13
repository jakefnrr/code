// Shared helpers for GreenChat.

// Build a deterministic DM chat id from two user ids.
export function dmChatId(a, b) {
  return [a, b].sort().join("_");
}

// Render an initial-based avatar from a stored hue.
export function avatarStyle(color) {
  const hue = parseInt(color || "150", 10) || 150;
  return { backgroundColor: `hsl(${hue}, 60%, 36%)` };
}

export function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function formatTime(d) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function randomHue() {
  return String(Math.floor(Math.random() * 360));
}