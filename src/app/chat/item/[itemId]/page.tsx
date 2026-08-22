"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/app/lib/supabase";

export default function ItemChatPage() {
  const params = useParams();
  const itemId = params.itemId as string;

  const [item, setItem] = useState<any>(null);
  const [conversations, setConversations] =
    useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) return;

    loadItemChats();

    const channel = supabase
      .channel(`item-chat-${itemId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          loadItemChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId]);

  async function loadItemChats() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    /*
      ITEM
    */

    const { data: itemData, error: itemError } =
      await supabase
        .from("items")
        .select(
          "id, title, image_url, user_id"
        )
        .eq("id", itemId)
        .single();

    if (itemError || !itemData) {
      console.error(
        "ITEM ERROR =",
        itemError
      );
      setLoading(false);
      return;
    }

    setItem(itemData);

    /*
      ITEM KI SAARI CONVERSATIONS
      current user ke relation ke saath
    */

    const {
      data: conversationData,
      error: conversationError,
    } = await supabase
      .from("conversations")
      .select("*")
      .eq("item_id", itemId)
      .or(
        `owner_id.eq.${user.id},buyer_id.eq.${user.id}`
      )
      .order("created_at", {
        ascending: false,
      });

    if (conversationError) {
      console.error(
        "CONVERSATION ERROR =",
        conversationError
      );
      setLoading(false);
      return;
    }

    const result: any[] = [];

    /*
      Har conversation ka
      saamne wala user nikalo
    */

    for (const conversation of
      conversationData || []) {
      const otherUserId =
        conversation.owner_id === user.id
          ? conversation.buyer_id
          : conversation.owner_id;

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("public_profiles")
        .select(`
          id,
          full_name,
          
          avatar_url,
          city,
          is_online,
          is_typing,
          last_seen,
          verified
        `)
        .eq("id", otherUserId)
        .single();

      if (profileError) {
        console.error(
          "PROFILE ERROR =",
          profileError
        );
      }

      /*
        UNREAD COUNT
      */

      const { count } = await supabase
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

      result.push({
        conversation,
        profile,
        unreadCount: count || 0,
      });
    }

    /*
      Latest conversation first
    */

    result.sort((a, b) => {
      const aTime = a.conversation
        .last_message_at
        ? new Date(
            a.conversation.last_message_at
          ).getTime()
        : new Date(
            a.conversation.created_at
          ).getTime();

      const bTime = b.conversation
        .last_message_at
        ? new Date(
            b.conversation.last_message_at
          ).getTime()
        : new Date(
            b.conversation.created_at
          ).getTime();

      return bTime - aTime;
    });

    

    setConversations(result);
    setLoading(false);
  }

  function getUsername(profile: any) {
    if (!profile) return "user";

    return (
      profile.full_name
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "") ||
      "user"
    );
  }

  return (
    <>
      <Navbar />

      <div
        style={{
          maxWidth: "850px",
          margin: "30px auto",
          padding: "20px",
        }}
      >
        {/* BACK */}

        <Link
          href="/chat"
          style={{
            textDecoration: "none",
            color: "#2563eb",
            fontWeight: "bold",
          }}
        >
          ← Back to Chats
        </Link>

        {/* ITEM HEADER */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
            background: "white",
            padding: "18px",
            borderRadius: "15px",
            marginTop: "20px",
            marginBottom: "25px",
            boxShadow:
              "0 2px 10px rgba(0,0,0,.08)",
          }}
        >
          <img
            src={
              item?.image_url ||
              "https://placehold.co/100x100?text=Item"
            }
            alt={item?.title || "Item"}
            style={{
              width: "70px",
              height: "70px",
              objectFit: "cover",
              borderRadius: "12px",
            }}
          />

          <div>
            <h2 style={{ margin: 0 }}>
              💬 {item?.title || "Item"}
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color: "#666",
              }}
            >
              People who messaged about this item
            </p>
          </div>
        </div>

        {/* TITLE */}

        <h3
          style={{
            marginBottom: "15px",
          }}
        >
          Messages
        </h3>

        {/* CONTENT */}

        {loading ? (
          <h3>Loading...</h3>
        ) : conversations.length === 0 ? (
          <div
            style={{
              background: "white",
              padding: "35px",
              borderRadius: "15px",
              textAlign: "center",
            }}
          >
            <h3>
              No conversations for this item.
            </h3>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {conversations.map((chat) => (
              <Link
                key={chat.conversation.id}
                href={`/chat/${chat.conversation.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "15px",
                    background: "white",
                    padding: "15px",
                    borderRadius: "15px",
                    boxShadow:
                      "0 2px 10px rgba(0,0,0,.08)",
                    cursor: "pointer",
                  }}
                >
                  {/* PROFILE */}

                  <div
                    style={{
                      position: "relative",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={
                        chat.profile
                          ?.avatar_url ||
                        "https://placehold.co/80x80?text=User"
                      }
                      alt=""
                      style={{
                        width: "62px",
                        height: "62px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />

                    {chat.profile?.is_online && (
                      <span
                        style={{
                          position: "absolute",
                          right: 1,
                          bottom: 2,
                          width: "14px",
                          height: "14px",
                          background: "#22c55e",
                          border:
                            "2px solid white",
                          borderRadius: "50%",
                        }}
                      />
                    )}
                  </div>

                  {/* USER */}

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "7px",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                        }}
                      >
                        {chat.profile
                          ?.full_name ||
                          "Unknown User"}
                      </h3>

                      {chat.profile
                        ?.verified && (
                        <span
                          style={{
                            color: "#2563eb",
                            fontWeight: "bold",
                          }}
                        >
                          ✔
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        margin: "3px 0",
                        color: "#888",
                        fontSize: "13px",
                      }}
                    >
                      @{getUsername(
                        chat.profile
                      )}
                    </p>

                    <p
                      style={{
                        margin: "5px 0 0",
                        color:
                          chat.profile?.is_typing
                            ? "#16a34a"
                            : "#666",
                        fontSize: "14px",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow:
                          "ellipsis",
                      }}
                    >
                      {chat.profile?.is_typing
                        ? "✍ Typing..."
                        : chat.conversation
                            .last_message ||
                          "Start conversation"}
                    </p>
                  </div>

                  {/* RIGHT */}

                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      alignItems:
                        "flex-end",
                      gap: "7px",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#999",
                      }}
                    >
                      {chat.conversation
                        .last_message_at
                        ? new Date(
                            chat.conversation
                              .last_message_at
                          ).toLocaleDateString(
                            [],
                            {
                              day: "numeric",
                              month: "short",
                            }
                          )
                        : ""}
                    </span>

                    {chat.unreadCount > 0 && (
                      <span
                        style={{
                          background:
                            "#2563eb",
                          color: "white",
                          borderRadius:
                            "50%",
                          minWidth: "23px",
                          height: "23px",
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {chat.unreadCount}
                      </span>
                    )}

                    <span
                      style={{
                        fontSize: "20px",
                        color: "#999",
                      }}
                    >
                      ›
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}