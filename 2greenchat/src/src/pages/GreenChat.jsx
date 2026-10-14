import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import Sidebar from "@/components/greenchat/Sidebar";
import ChatView from "@/components/greenchat/ChatView";
import ChatsTab from "@/components/greenchat/ChatsTab";
import FriendsTab from "@/components/greenchat/FriendsTab";
import GroupsTab from "@/components/greenchat/GroupsTab";
import NotificationsTab from "@/components/greenchat/NotificationsTab";
import ProfileTab from "@/components/greenchat/ProfileTab";
import SettingsTab from "@/components/greenchat/SettingsTab";

export default function GreenChat() {
  const [me, setMe] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("chats");
  const [activeChat, setActiveChat] = useState(null);
  const [unread, setUnread] = useState(0);

  async function loadMe() {
    const user = await base44.auth.me();
    setMe(user);
    const page = await base44.entities.UserProfile.filter(
      { user_id: user.id },
      { limit: 1 }
    );
    setMyProfile((page.items || [])[0] || null);
    setLoading(false);
  }

  async function loadUnread() {
    if (!me) return;
    const count = await base44.entities.Friendship.count({
      to_user_id: me.id,
      status: "pending",
    });
    setUnread(count || 0);
  }

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    loadUnread();
    if (!me) return;
    const unsubscribe = base44.entities.Friendship.subscribe((event) => {
      if (!event || !event.data) return;
      if (event.data.to_user_id !== me.id) return;
      loadUnread();
    });
    return unsubscribe;
  }, [me]);

  function handleTab(tab) {
    setActiveChat(null);
    setActiveTab(tab);
  }

  function openChat(chat) {
    setActiveChat(chat);
    if (chat.chat_id.startsWith("group_")) setActiveTab("groups");
    else setActiveTab("chats");
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // First-time: require a profile before anything else.
  if (!myProfile) {
    return (
      <div className="h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-primary text-primary-foreground px-6 py-5">
            <h1 className="text-2xl font-bold">GreenChat</h1>
            <p className="text-sm opacity-90">Welcome! Let's set up your profile.</p>
          </div>
          <div className="p-2">
            <ProfileTab me={me} myProfile={null} onSaved={loadMe} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-background overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTab={handleTab}
        myProfile={myProfile}
        unreadCount={unread}
      />

      <main className="order-1 md:order-2 flex-1 min-w-0 h-full">
        {activeChat ? (
          <ChatView
            chatId={activeChat.chat_id}
            title={activeChat.title}
            subtitle={activeChat.subtitle}
            me={me}
            myUsername={myProfile.username}
            participants={activeChat.participants}
            onBack={() => setActiveChat(null)}
          />
        ) : activeTab === "chats" ? (
          <ChatsTab me={me} myProfile={myProfile} onOpenChat={openChat} />
        ) : activeTab === "friends" ? (
          <FriendsTab me={me} myProfile={myProfile} onOpenChat={openChat} />
        ) : activeTab === "groups" ? (
          <GroupsTab me={me} myProfile={myProfile} onOpenChat={openChat} />
        ) : activeTab === "notifications" ? (
          <NotificationsTab me={me} />
        ) : activeTab === "profile" ? (
          <ProfileTab me={me} myProfile={myProfile} onSaved={loadMe} />
        ) : (
          <SettingsTab me={me} myProfile={myProfile} />
        )}
      </main>
    </div>
  );
}