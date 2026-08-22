"use client";

import { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/app/lib/supabase";

type ChatGroup = {
  item_id: string;
  title: string;
  image_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  conversation_count: number;
  unread_count: number;
};

export default function ChatPage() {
  const [chats, setChats] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);

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
        () => {
          loadChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadChats() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    

    if (!user) {
      setChats([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("conversations")
      .select(`
        id,
        item_id,
        owner_id,
        buyer_id,
        last_message,
        last_message_at,
        created_at,
        items (
          id,
          title,
          image_url
        )
      `)
      .or(`owner_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    

    if (error) {
      console.error("CHAT LOAD ERROR =", error);
      setChats([]);
      setLoading(false);
      return;
    }

    const groupMap = new Map<string, ChatGroup>();

    for (const conversation of data || []) {
      const item = conversation.items as any;

      if (!item) continue;

      const conversationDate =
        conversation.last_message_at ||
        conversation.created_at;

      const existing = groupMap.get(
        conversation.item_id
      );

      /*
        First conversation for this item
      */
      if (!existing) {
        groupMap.set(conversation.item_id, {
          item_id: conversation.item_id,
          title: item.title,
          image_url: item.image_url,
          last_message:
            conversation.last_message || null,
          last_message_at: conversationDate,
          conversation_count: 1,
          unread_count: 0,
        });
      } else {
        /*
          Same item ki dusri/teesri conversation
        */
        existing.conversation_count += 1;

        const oldTime = existing.last_message_at
          ? new Date(
              existing.last_message_at
            ).getTime()
          : 0;

        const newTime = conversationDate
          ? new Date(conversationDate).getTime()
          : 0;

        /*
          Group ke andar latest conversation
          ka last message show karna hai.
        */
        if (newTime > oldTime) {
          existing.last_message =
            conversation.last_message || null;

          existing.last_message_at =
            conversationDate;
        }
      }

      /*
        Current conversation ke unread messages
      */
      const { count, error: unreadError } =
        await supabase
          .from("messages")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq(
            "conversation_id",
            conversation.id
          )
          .eq("receiver_id", user.id)
          .eq("is_read", false);

      if (unreadError) {
        console.error(
          "UNREAD ERROR =",
          unreadError
        );
      }

      const group = groupMap.get(
        conversation.item_id
      );

      if (group) {
        group.unread_count += count || 0;
      }
    }

    const groupedChats = Array.from(
      groupMap.values()
    );

    /*
      Latest activity ke hisaab se item groups
      arrange karo.
    */
    groupedChats.sort((a, b) => {
      const aTime = a.last_message_at
        ? new Date(a.last_message_at).getTime()
        : 0;

      const bTime = b.last_message_at
        ? new Date(b.last_message_at).getTime()
        : 0;

      return bTime - aTime;
    });

    

    setChats(groupedChats);
    setLoading(false);
  }

  function formatDate(date: string | null) {
    if (!date) return "";

    const value = new Date(date);

    return value.toLocaleDateString([], {
      day: "numeric",
      month: "short",
    });
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
          <div
            style={{
              display: "grid",
              gap: "15px",
              marginTop: "25px",
            }}
          >
            {chats.map((chat) => (
              <button
                key={chat.item_id}
                onClick={() => {
                  window.location.href =
                    `/chat/item/${chat.item_id}`;
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  gap: "15px",
                  alignItems: "center",
                  background: "white",
                  padding: "15px",
                  borderRadius: "12px",
                  border: "none",
                  boxShadow:
                    "0 2px 10px rgba(0,0,0,.1)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {/* ITEM IMAGE */}

                <img
                  src={
                    chat.image_url ||
                    "https://placehold.co/100x100?text=Item"
                  }
                  alt={chat.title}
                  style={{
                    width: "75px",
                    height: "75px",
                    objectFit: "cover",
                    borderRadius: "10px",
                    flexShrink: 0,
                  }}
                />

                {/* ITEM INFO */}

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      marginBottom: "5px",
                    }}
                  >
                    {chat.title}
                  </h3>

                  <p
                    style={{
                      color: "#666",
                      margin: 0,
                      fontSize: "14px",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {chat.last_message ||
                      "Start conversation"}
                  </p>

                  <p
                    style={{
                      color: "#999",
                      margin: "6px 0 0",
                      fontSize: "12px",
                    }}
                  >
                    {chat.conversation_count}{" "}
                    {chat.conversation_count === 1
                      ? "conversation"
                      : "conversations"}

                    {chat.last_message_at
                      ? ` • ${formatDate(
                          chat.last_message_at
                        )}`
                      : ""}
                  </p>
                </div>

                {/* UNREAD */}

                {chat.unread_count > 0 && (
                  <span
                    style={{
                      background: "red",
                      color: "white",
                      borderRadius: "50%",
                      minWidth: "23px",
                      height: "23px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                      flexShrink: 0,
                    }}
                  >
                    {chat.unread_count}
                  </span>
                )}

                <span
                  style={{
                    fontSize: "22px",
                    color: "#999",
                    flexShrink: 0,
                  }}
                >
                  ›
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}