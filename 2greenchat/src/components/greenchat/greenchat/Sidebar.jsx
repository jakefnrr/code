import React from "react";
import { MessageCircle, UserPlus, Users, Bell, User, Settings } from "lucide-react";
import { initials, avatarStyle } from "@/lib/greenchat";

const TABS = [
  { id: "chats", label: "Chats", icon: MessageCircle },
  { id: "friends", label: "Friends", icon: UserPlus },
  { id: "groups", label: "Groups", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "profile", label: "Profile", icon: User },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ activeTab, onTab, myProfile, unreadCount }) {
  return (
    <nav className="order-2 md:order-1 shrink-0 bg-sidebar border-t border-border md:border-t-0 md:border-r flex flex-row md:flex-col items-stretch justify-around md:justify-start md:w-20 md:h-full h-16 z-20">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTab(tab.id)}
            className={
              "relative flex flex-1 md:flex-none md:h-20 flex-col items-center justify-center gap-1 py-2 transition-colors " +
              (active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            <Icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={active ? 2.4 : 2} />
            <span className="text-[10px] md:text-xs font-medium leading-none">
              {tab.label}
            </span>
            {tab.id === "notifications" && unreadCount > 0 && (
              <span className="absolute top-1 right-2 md:top-2 md:right-3 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            {active && (
              <span className="hidden md:block absolute left-0 top-0 h-full w-1 bg-primary rounded-r" />
            )}
          </button>
        );
      })}
      <div className="hidden md:flex items-center justify-center mt-auto pb-4 pt-4 border-t border-border">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={avatarStyle(myProfile?.avatar_color)}
        >
          {initials(myProfile?.display_name || myProfile?.username)}
        </div>
      </div>
    </nav>
  );
}