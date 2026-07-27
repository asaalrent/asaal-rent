"use client";

import { use, useEffect, useRef, useState } from "react";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";


export default function ChatRoom({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const router = useRouter();
  console.log("conversationId =", conversationId);
  const [message, setMessage] = useState("");
const [sending, setSending] = useState(false);
const [messages, setMessages] = useState<any[]>([]);
const [currentUser, setCurrentUser] = useState("");

const bottomRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  if (!conversationId) return;
supabase.auth.getUser().then(({ data }) => {
  if (data.user) {
    setCurrentUser(data.user.id);
    console.log("CURRENT USER =", data.user.id);
  }
});
  loadMessages();

  const channel = supabase
    .channel(`chat-${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => {
        loadMessages();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [conversationId]);
useEffect(() => {
  bottomRef.current?.scrollIntoView({
    behavior: "smooth",
  });
}, [messages]);
async function loadMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("ERROR:", error);
alert(JSON.stringify(error));
    return;
  }
console.log("MESSAGES =", data);
  setMessages(data || []);
  const {
  data: { user },
} = await supabase.auth.getUser();

if (user) {
  const { data: updatedRows, error: updateError } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .eq("receiver_id", user.id)
    .eq("is_read", false)
    .select();

  console.log("UPDATED ROWS =", updatedRows);
  console.log("READ UPDATE ERROR =", updateError);
}
}
async function sendMessage() {
   
  if (!message.trim()) return;

  setSending(true);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert("Please login first");
    setSending(false);
    return;
  }

  const { data: conversation } = await supabase
  .from("conversations")
  .select("*")
  .eq("id", conversationId)
  .single();
  console.log("CONVERSATION =", conversation);
console.log("conversationId =", conversationId);

if (!conversation) {
  alert("Conversation not found");
  setSending(false);
  return;
}

const receiverId =
  conversation.owner_id === user.id
    ? conversation.buyer_id
    : conversation.owner_id;
    console.log("SENDER =", user.id);
console.log("RECEIVER =", receiverId);

  const { error } = await supabase
    .from("messages")
    .insert({
     conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: receiverId,
      message: message,
      is_read: false,
    });
    await supabase.from("notifications").insert({
  user_id: receiverId,
  title: "💬 New Message",
  message: "You received a new message.",
  is_read: false,
});
const { error: conversationError } = await supabase
  .from("conversations")
  .update({
    last_message: message,
    last_message_at: new Date().toISOString(),
  })
  .eq("id", conversationId);

console.log("CONVERSATION UPDATE ERROR =", conversationError);
const { data: updatedConversation } = await supabase
  .from("conversations")
  .select("*")
  .eq("id", conversationId)
  .single();

console.log("UPDATED CONVERSATION =", updatedConversation);

  setSending(false);

  if (error) {
    alert(error.message);
    return;
  }

 setMessage("");
await loadMessages();

}
console.log("MESSAGES =", messages);
console.log("MESSAGES LENGTH =", messages.length);

  return (
    <>
      <Navbar />

      <div
        style={{
          maxWidth: "900px",
          margin: "30px auto",
          padding: "20px",
        }}
      >
        <h2>💬 Chat</h2>

       

        <hr style={{ margin: "20px 0" }} />

        <div
  style={{
    height: "500px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "20px",
    overflowY: "auto",
    background: "#fafafa",
  }}
>
  {messages.length === 0 ? (
    <p>No messages yet.</p>
  ) : (
<>
  {messages.map((msg) => (
  <div
    key={msg.id}
    style={{
      display: "flex",
      justifyContent:
        msg.sender_id === currentUser ? "flex-end" : "flex-start",
      marginBottom: "12px",
    }}
  >
    <div
      style={{
        background:
          msg.sender_id === currentUser ? "#2563eb" : "#e5e7eb",
        color:
          msg.sender_id === currentUser ? "white" : "black",
        padding: "12px 16px",
        borderRadius: "15px",
        maxWidth: "70%",
        wordBreak: "break-word",
      }}
    >
      {msg.message}
    </div>
      </div>
  ))}

  <div ref={bottomRef}></div>
</>
)}
</div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "20px",
          }}
        >
         <input
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  placeholder="Type a message..."
  style={{
    flex: 1,
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #ccc",
  }}
/>

          <button
  onClick={sendMessage}
  disabled={sending}
  style={{
    padding: "14px 25px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
  }}
>
  {sending ? "Sending..." : "Send"}
</button>
        </div>
      </div>
    </>
  );
}