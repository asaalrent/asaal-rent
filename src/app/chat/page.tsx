"use client";

import { useEffect, useState } from "react";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/app/lib/supabase";

export default function ChatPage() {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
  loadChats();

  const channel = supabase
    .channel("chat-list")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
      },
      (_payload: RealtimePostgresChangesPayload<any>) => {
        loadChats();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  async function loadChats() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log("LOGIN USER =", user?.id);

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
  .from("conversations")
  .select(`
    *,
    items (
      id,
      title,
      image_url
    )
  `)
  .or(`owner_id.eq.${user.id},buyer_id.eq.${user.id}`)
  .order("created_at", { ascending: false });

console.log("CONVERSATIONS =", data);
for (const chat of data || []) {
  const { count } = await supabase
    .from("messages")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("conversation_id", chat.id)
    .eq("receiver_id", user.id)
    .eq("is_read", false);

  console.log(chat.id, "Unread =", count);
}

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setChats(data || []);
    console.log("CHAT DATA =", data);
    const counts: { [key: string]: number } = {};

for (const chat of data || []) {
  const { count } = await supabase
    .from("messages")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("conversation_id", chat.id)
    .eq("receiver_id", user.id)
    .eq("is_read", false);
    const { data: unreadRows } = await supabase
  .from("messages")
  .select("*")
  .eq("conversation_id", chat.id);

console.log("ALL ROWS =", unreadRows);

  counts[chat.id] = count || 0;
}
console.log("COUNTS =", counts);
setUnreadCounts(counts);
console.log("STATE UPDATED");
    setLoading(false);
  }

  return (
    <>
      <Navbar />

      <div
        style={{
          maxWidth: "900px",
          margin: "40px auto",
          padding: "20px",
        }}
      >
        <h1>💬 Chats</h1>

        {loading ? (
          <h3>Loading...</h3>
        ) : chats.length === 0 ? (
          <h3>No conversations yet.</h3>
        ) : (
          chats.map((chat) => (
            <Link
              key={chat.id}
              href={`/chat/${chat.id}`}
              style={{
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "15px",
                  alignItems: "center",
                  background: "white",
                  padding: "15px",
                  borderRadius: "12px",
                  marginTop: "15px",
                  boxShadow: "0 2px 10px rgba(0,0,0,.1)",
                }}
              >
                <img
                  src={chat.items.image_url}
                  alt={chat.items.title}
                  style={{
                    width: "70px",
                    height: "70px",
                    objectFit: "cover",
                    borderRadius: "10px",
                  }}
                />

                <div>
                  <h3>{chat.items.title}</h3>

                <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "10px",
  }}
>
  <p
  style={{
    color: "#666",
    marginTop: "5px",
    fontSize: "14px",
    maxWidth: "250px",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  }}
>
  {chat.last_message || "Start conversation"}
</p>

  {unreadCounts[chat.id] > 0 && (
    <span
      style={{
        background: "red",
        color: "white",
        borderRadius: "50%",
        minWidth: "22px",
        height: "22px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: "bold",
      }}
    >
      {unreadCounts[chat.id]}
    </span>
  )}
</div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}