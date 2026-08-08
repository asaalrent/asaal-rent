"use client";

import { use, useEffect, useRef, useState } from "react";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/app/lib/supabase";
import EmojiPicker from "emoji-picker-react";
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
  const [showEmoji, setShowEmoji] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
const [editText, setEditText] = useState("");
const [replyMessage, setReplyMessage] = useState<any>(null);
const [replyPreview, setReplyPreview] = useState<any>(null);
const [menuMessage, setMenuMessage] = useState<any>(null);
const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
const [showMenu, setShowMenu] = useState(false);
const [menuPosition, setMenuPosition] = useState({
  x: 0,
  y: 0,
});
  const [image, setImage] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [audio, setAudio] = useState<Blob | null>(null);
const [recording, setRecording] = useState(false);

const mediaRecorder = useRef<MediaRecorder | null>(null);
const audioChunks = useRef<Blob[]>([]);
const [sending, setSending] = useState(false);
const [messages, setMessages] = useState<any[]>([]);
const [currentUser, setCurrentUser] = useState("");

useEffect(() => {
  
  async function getUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setCurrentUser(user.id);
    }
  }

  getUser();
}, []);

const [otherUser, setOtherUser] = useState<any>(null);

const otherUserRef = useRef<any>(null);
const typingTimeout = useRef<NodeJS.Timeout | null>(null);

const bottomRef = useRef<HTMLDivElement>(null);
const chatChannelRef = useRef<any>(null);

useEffect(() => {
  if (!conversationId) return;

  let mounted = true;

  async function init() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!mounted) return;

    if (user) {
      setCurrentUser(user.id);
    }

    await loadMessages();

    // Purana channel remove karo
    if (chatChannelRef.current) {
      await supabase.removeChannel(chatChannelRef.current);
      chatChannelRef.current = null;
    }

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          if (payload.new.id === otherUserRef.current?.id) {
            setOtherUser(payload.new);
          }
        }
      );

    await channel.subscribe();

    chatChannelRef.current = channel;
  }

  init();

  return () => {
    mounted = false;

    if (chatChannelRef.current) {
      supabase.removeChannel(chatChannelRef.current);
      chatChannelRef.current = null;
    }
  };
}, [conversationId]);

useEffect(() => {
  bottomRef.current?.scrollIntoView({
    behavior: "smooth",
  });
}, [messages]);

useEffect(() => {
  if (!conversationId) return;

  console.log("CHANNEL CREATED =", `messages-${conversationId}`);
  const channel = supabase.channel(`messages-${conversationId}`);
  
  console.log("CURRENT USER =", currentUser);

console.log("FILTER =", `receiver_id=eq.${currentUser}`);

  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "messages",
    },
    () => {
      loadMessages();
    }
  );
  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "message_reactions",
    },
    () => {
      loadMessages();
    }
  );
 
  channel.on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "calls",
  },
  (payload) => {
    console.log("🔥 RAW CALL EVENT =", payload);

    const call = payload.new as any;

    if (call.receiver_id !== currentUser) return;

    alert("CALL RECEIVED");

    router.push(`/incoming-call/${call.id}`);
  }
);
  

channel.subscribe((status) => {
  console.log("CHANNEL STATUS =", status);
});

  return () => {
    supabase.removeChannel(channel);
  };
}, [conversationId, currentUser]);


async function loadMessages() {
  const { data, error } = await supabase
    .from("messages")
.select(`
  *,
  reply:reply_to(
    id,
    message,
    image_url,
    audio_url
  ),
  reactions:message_reactions(
    id,
    emoji,
    user_id
  )
`)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("ERROR:", error);
alert(JSON.stringify(error));
    return;
  }
  const {
  data: { user },
} = await supabase.auth.getUser();

console.log("USER =", user);
console.log("USER ID =", user?.id);

console.log("MESSAGES =", data);
  setMessages(data || []);
  console.log("ALL MESSAGES =", data);
  const { data: conversation } = await supabase
  .from("conversations")
  .select("*")
  .eq("id", conversationId)
  .single();

if (conversation && user) {
  const otherUserId =
    conversation.owner_id === user.id
      ? conversation.buyer_id
      : conversation.owner_id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", otherUserId)
    .single();

    console.log("CONVERSATION =", conversation);
console.log("OTHER USER ID =", otherUserId);
console.log("PROFILE =", profile);

console.log("PROFILE DATA =", profile);

  otherUserRef.current = profile;
setOtherUser(profile);
}
 

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
async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  const recorder = new MediaRecorder(stream);

  mediaRecorder.current = recorder;

  audioChunks.current = [];

  recorder.ondataavailable = (e) => {
    audioChunks.current.push(e.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(audioChunks.current, {
      type: "audio/webm",
    });

    setAudio(blob);
  };

  recorder.start();

  setRecording(true);
}

function stopRecording() {
  mediaRecorder.current?.stop();
  setRecording(false);
}



async function sendLocation() {
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: conversation } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      const receiverId =
        conversation.owner_id === user.id
          ? conversation.buyer_id
          : conversation.owner_id;

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        receiver_id: receiverId,
        latitude,
        longitude,
        is_read: false,
      });

      await loadMessages();
    },
    (err) => {
      alert(err.message);
    }
  );
}

async function startVoiceCall() {
  console.log("STEP-1");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (!conversation) {
    alert("Conversation not found");
    return;
  }

  const receiverId =
    conversation.owner_id === user.id
      ? conversation.buyer_id
      : conversation.owner_id;

  const { error } = await supabase
    .from("calls")
    .insert({
      conversation_id: conversationId,
      caller_id: user.id,
      receiver_id: receiverId,
      call_type: "voice",
      status: "calling",
    });
    const { data: testCall } = await supabase
  .from("calls")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(1);

console.log("LAST CALL =", testCall);

  console.log("CALL ERROR =", error);

  const { data } = await supabase
  .from("calls")
  .select("*")
  .eq("conversation_id", conversationId)
  .order("created_at", { ascending: false })
  .limit(1);

console.log("INSERTED CALL =", data);

  const { data: lastCall } = await supabase
  .from("calls")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(1);

console.log("LAST CALL =", lastCall);

  if (error) {
    alert(error.message);
    return;
  }
  console.log("STEP-2");
router.push(`/call/${conversationId}`);

  
}


async function sendMessage() {

    console.log("MESSAGE =", message);
  console.log("IMAGE =", image);
  console.log("FILE =", file);
  console.log("AUDIO =", audio);
   
 if (!message.trim() && !image && !audio && !file) return;

  setSending(true);
  let imageUrl = null;
  let audioUrl = null;

  let fileUrl = null;
let fileName = null;
let fileType = null;

if (image) {
  console.log("Uploading File =", image);

const fileName = `${Date.now()}-${image.name}`;

console.log("File Name =", fileName);

  const { error: uploadError } = await supabase.storage
    .from("chat-images")
    .upload(fileName, image);

  if (uploadError) {
    alert(uploadError.message);
    setSending(false);
    return;
  }

  imageUrl = supabase.storage
    .from("chat-images")
    .getPublicUrl(fileName).data.publicUrl;
    console.log("IMAGE URL =", imageUrl);
}

if (file) {
  const uploadName = `${Date.now()}-${file.name}`;

  const { error: fileError } = await supabase.storage
    .from("chat-files")
    .upload(uploadName, file);

  if (fileError) {
    alert(fileError.message);
    setSending(false);
    return;
  }

  fileUrl = supabase.storage
    .from("chat-files")
    .getPublicUrl(uploadName).data.publicUrl;

  fileName = file.name;
  fileType = file.type;
}

if (audio) {
  console.log("Uploading audio...", audio);
  const audioName = `${Date.now()}.webm`;

  const { error: audioError } = await supabase.storage
    .from("chat-audio")
    .upload(audioName, audio);

  if (audioError) {
    alert(audioError.message);
    setSending(false);
    return;
  }

  audioUrl = supabase.storage
    .from("chat-audio")
    .getPublicUrl(audioName).data.publicUrl;
}

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
  message,
  image_url: imageUrl,
  audio_url: audioUrl,

  file_url: fileUrl,
  file_name: fileName,
  file_type: fileType,

  is_read: false,
  reply_to: replyMessage?.id ?? null,
});

    console.log("INSERT ERROR =", error);
    console.log("IMAGE URL =", imageUrl);

const { data: testData, error: testError } = await supabase
  .from("messages")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(1);

console.log("LAST MESSAGE =", testData);
console.log("INSERT ERROR =", error);
console.log("SELECT ERROR =", testError);
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
setImage(null);
setAudio(null);
setFile(null);

setReplyMessage(null);
setReplyPreview(null);

const {
  data: { user: current },
} = await supabase.auth.getUser();

if (current) {
  await supabase
    .from("profiles")
    .update({
      is_typing: false,
    })
    .eq("id", current.id);
}

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

        {otherUser && (
  <div
    style={{
      marginTop: "10px",
      marginBottom: "15px",
      color: "#555",
      fontSize: "15px",
      fontWeight: "bold",
    }}
  >
    {otherUser.is_typing ? (
  <span
    style={{
      color: "#16a34a",
      fontWeight: "bold",
    }}
  >
    ✍ Typing...
  </span>
) : otherUser.is_online ? (
  <span style={{ color: "green" }}>
    🟢 Online
  </span>
) : (
      <span>
        ⚫ Last seen{" "}
        {otherUser.last_seen
          ? new Date(otherUser.last_seen).toLocaleString()
          : "Unknown"}
      </span>
    )}
    <div
  style={{
    marginTop: "6px",
    fontSize: "12px",
    color: "#16a34a",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  }}
>
  <span>🔒</span>
  <span>End-to-end encrypted</span>
</div>
<button
  onClick={startVoiceCall}
  style={{
    marginLeft: "10px",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "none",
    background: "#16a34a",
    color: "#fff",
    cursor: "pointer",
  }}
>
  📞
</button>
  </div>
)}

       

        <hr style={{ margin: "20px 0" }} />
        <div
  style={{
    display: "flex",
    justifyContent: "center",
    marginBottom: "15px",
  }}
>
  <div
    style={{
      background: "#FFF7D6",
      color: "#7A5A00",
      padding: "10px 16px",
      borderRadius: "12px",
      fontSize: "13px",
      maxWidth: "450px",
      textAlign: "center",
      lineHeight: "20px",
      border: "1px solid #F5D565",
    }}
  >
    🔒 Messages and calls are end-to-end encrypted.
    <br />
    No one outside this chat can read, listen to or share them.
  </div>
</div>

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
 {messages.map((msg, index) => {
  console.log("MESSAGE =", msg);
  console.log("REACTIONS =", msg.reactions);

  const currentDate = new Date(msg.created_at).toDateString();

const previousDate =
  index > 0
    ? new Date(messages[index - 1].created_at).toDateString()
    : "";

const showDate = currentDate !== previousDate;

const today = new Date().toDateString();

const yesterday = new Date(
  Date.now() - 24 * 60 * 60 * 1000
).toDateString();

let dateLabel = currentDate;

if (currentDate === today) {
  dateLabel = "Today";
} else if (currentDate === yesterday) {
  dateLabel = "Yesterday";
}

 return (
  <div key={msg.id}>
    {showDate && (
      <div
        style={{
          textAlign: "center",
          margin: "20px 0",
        }}
      >
        <span
          style={{
            background: "#e5e7eb",
            padding: "6px 14px",
            borderRadius: "20px",
            fontSize: "13px",
            color: "#555",
            fontWeight: "bold",
          }}
        >
          {dateLabel}
        </span>
      </div>
    )}

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
  onContextMenu={(e) => {
    e.preventDefault();
    setMenuMessage(msg);
    setShowMenu(true);
  }}
  onClick={(e) => {
  const rect = e.currentTarget.getBoundingClientRect();

  setMenuPosition({
    x: rect.left + rect.width / 2,
    y: rect.top,
  });

  setSelectedMessageId(msg.id);
  setMenuMessage(msg);
  setShowMenu(true);
}}
  style={{
    background:
  selectedMessageId === msg.id
    ? "#dbeafe"
    : msg.sender_id === currentUser
    ? "#2563eb"
    : "#e5e7eb",
    color:
  selectedMessageId === msg.id
    ? "#111"
    : msg.sender_id === currentUser
    ? "white"
    : "black",
    padding: "12px 16px",
    borderRadius: "15px",
    maxWidth: "70%",
    wordBreak: "break-word",
    cursor: "pointer",
  }}
>
  <div
  style={{
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "6px",
    color:
      msg.sender_id === currentUser
        ? "#bfdbfe"
        : "#2563eb",
  }}
>
  {msg.sender_id === currentUser
    ? "You"
    : otherUser?.full_name ||
      otherUser?.name ||
      "User"}
</div>


 <>
 {msg.reply_to && (
  <div
    style={{
      background: "rgba(0,0,0,.08)",
      padding: "8px",
      borderLeft: "3px solid #16a34a",
      borderRadius: "8px",
      marginBottom: "10px",
      fontSize: "13px",
    }}
  >
    {msg.reply?.message ||
      (msg.reply?.image_url
        ? "📷 Photo"
        : msg.reply?.audio_url
        ? "🎤 Voice Message"
        : "")}
  </div>
)}

  {msg.image_url && (
    <img
      src={msg.image_url}
      alt=""
      style={{
        width: "220px",
        borderRadius: "10px",
        marginBottom: "10px",
      }}
    />
  )}

  {msg.audio_url && (
    <audio
      controls
      src={msg.audio_url}
      style={{
        width: "100%",
        marginBottom: "10px",
      }}
    />
  )}

{msg.latitude && msg.longitude && (
  <div
    style={{
      marginBottom: "10px",
      padding: "10px",
      borderRadius: "10px",
      background: "#f3f4f6",
    }}
  >
    📍 Live Location

    <br />

    <a
      href={`https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: "#2563eb",
        textDecoration: "underline",
      }}
    >
      Open in Google Maps
    </a>
  </div>
)}

  {msg.file_url && (
  <div
    style={{
      marginBottom: "10px",
      padding: "10px",
      border: "1px solid #ddd",
      borderRadius: "8px",
      background: "#fff",
    }}
  >
    📄 {msg.file_name}

    <br />

    <a
      href={msg.file_url}
      target="_blank"
      rel="noopener noreferrer"
    >
      Download
    </a>
  </div>
)}

  {editingId === msg.id ? (
  <div>
    <input
      value={editText}
      onChange={(e) => setEditText(e.target.value)}
      style={{
        width: "100%",
        padding: "8px",
        borderRadius: "8px",
        border: "1px solid #ccc",
      }}
    />

    <div
      style={{
        marginTop: "8px",
        display: "flex",
        gap: "8px",
      }}
    >
      <button
        onClick={async () => {
          const { error } = await supabase
            .from("messages")
            .update({
              message: editText,
              is_edited: true,
            })
            .eq("id", msg.id);

          if (error) {
            alert(error.message);
            return;
          }

          setEditingId(null);
          await loadMessages();
        }}
      >
        💾 Save
      </button>

      <button
        onClick={() => {
          setEditingId(null);
        }}
      >
        ❌ Cancel
      </button>
    </div>
  </div>
) : (
  <>
    {msg.message && (
      <div>
        {msg.message}

        {msg.is_edited && (
          <span
            style={{
              marginLeft: "8px",
              fontSize: "11px",
              opacity: 0.7,
            }}
          >
            (edited)
          </span>
        )}
      </div>
    )}
  </>
)}


 
</>
{msg.reactions?.length > 0 && (
  <div
    style={{
      display: "flex",
      gap: "6px",
      marginTop: "8px",
      marginBottom: "6px",
      flexWrap: "wrap",
    }}
  >
    {(Array.from(
      new Set(msg.reactions.map((r: any) => r.emoji))
    ) as string[]).map((emoji) => (
      <span
        key={emoji}
        style={{
          background: "#eee",
          borderRadius: "20px",
          padding: "3px 8px",
          fontSize: "13px",
        }}
      >
        {emoji}{" "}
        {msg.reactions.filter((r: any) => r.emoji === emoji).length}
      </span>
    ))}
  </div>
)}

  <div
    style={{
      marginTop: "6px",
      fontSize: "12px",
      opacity: 0.8,
      textAlign: "right",
    }}
  >
    {new Date(msg.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}

    {msg.sender_id === currentUser && (
      <span style={{ marginLeft: "8px" }}>
        {msg.is_read ? "✓✓" : "✓"}
      </span>
    )}
  </div>
  </div>
            </div>
    </div>
  );
  })}

  <div ref={bottomRef}></div>
</>
)}
</div>

      <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "20px",
    position: "relative",
  }}
>
  {replyMessage && (
  <div
    style={{
      width: "100%",
      background: "#dcfce7",
      padding: "10px",
      borderLeft: "4px solid #16a34a",
      borderRadius: "8px",
      marginBottom: "10px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <div>
      <div
        style={{
          fontWeight: "bold",
          color: "#16a34a",
        }}
      >
        Replying to
      </div>

      <div
        style={{
          color: "#555",
          fontSize: "14px",
        }}
      >
        {replyPreview}
      </div>
    </div>

    <button
      onClick={() => {
        setReplyMessage(null);
        setReplyPreview(null);
      }}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontSize: "18px",
      }}
    >
      ✖
    </button>
  </div>
)}

<button
  onClick={() => setShowEmoji(!showEmoji)}
  style={{
    background: "transparent",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
  }}
>
  😀
</button>

  <label
    htmlFor="imageUpload"
    style={{
      fontSize: "28px",
      cursor: "pointer",
      padding: "8px",
    }}
  >
    📎
  </label>
  {!recording ? (
  <button onClick={startRecording}>
    🎤
  </button>
) : (
  <button onClick={stopRecording}>
    ⏹
  </button>
)}
 

  <input
    id="imageUpload"
    type="file"
    accept="image/*"
    style={{ display: "none" }}
   onChange={(e) => {
  const file = e.target.files?.[0];

  console.log("SELECTED FILE =", file);

  if (file) {
    setImage(file);
  }
}}
  />

<label
  htmlFor="fileUpload"
  style={{
    fontSize: "28px",
    cursor: "pointer",
    padding: "8px",
  }}
>
  📄
</label>

<button
  onClick={sendLocation}
  style={{
    background: "transparent",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
  }}
>
  📍
</button>

<input
  id="fileUpload"
  type="file"
  style={{ display: "none" }}
  onChange={(e) => {
    const selected = e.target.files?.[0];

    if (selected) {
      setFile(selected);
    }
  }}
/>
{file && (
  <div
    style={{
      marginBottom: "10px",
      padding: "8px",
      background: "#f3f4f6",
      borderRadius: "8px",
    }}
  >
    📄 {file.name}
  </div>
)}

  {audio && (
  <audio
    controls
    src={URL.createObjectURL(audio)}
    style={{
      width: "100%",
      marginBottom: "10px",
    }}
  />
)}

{showEmoji && (
  <div
    style={{
      position: "absolute",
      bottom: "70px",
      left: "20px",
      zIndex: 9999,
    }}
  >
    <EmojiPicker
      onEmojiClick={(emojiData) => {
  setMessage((prev) => prev + emojiData.emoji);
  setShowEmoji(false);
}}
    />
  </div>
)}

  <input
    value={message}
    onChange={async (e) => {
  setMessage(e.target.value);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } = await supabase
  .from("profiles")
  .update({
    is_typing: true,
  })
  .eq("id", user.id)
  .select();

console.log("DATA =", data);
console.log("ERROR =", error);

  if (typingTimeout.current) {
    clearTimeout(typingTimeout.current);
  }

  typingTimeout.current = setTimeout(async () => {
    await supabase
      .from("profiles")
      .update({
        is_typing: false,
      })
      .eq("id", user.id);
  }, 1000);
}}
  />

{recording ? (
  <button
    onClick={stopRecording}
    style={{
      background: "red",
      color: "white",
      border: "none",
      padding: "12px",
      borderRadius: "10px",
      cursor: "pointer",
    }}
  >
    ⏹ Stop
  </button>
) : (
  <button
    onClick={startRecording}
    style={{
      background: "#16a34a",
      color: "white",
      border: "none",
      padding: "12px",
      borderRadius: "10px",
      cursor: "pointer",
    }}
  >
    🎤
  </button>
)}
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

  {showMenu && menuMessage && (
  <div
   onClick={() => {
  setShowMenu(false);
  setSelectedMessageId(null);
}}
    style={{
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.20)",
  display: "block",
  zIndex: 9999,
}}
  >
    <div
      onClick={(e) => e.stopPropagation()}
     style={{
  position: "absolute",
  left: menuPosition.x,
  top: menuPosition.y - 220,
  transform: "translateX(-50%) scale(1)",
  transformOrigin: "bottom center",
  background: "#fff",
  borderRadius: "22px",
  width: "290px",
  overflow: "hidden",
  boxShadow: "0 20px 60px rgba(0,0,0,.30)",
  animation: "popup .18s ease",
}}
    >
     <div
  style={{
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    padding: "14px 18px",
    borderBottom: "1px solid #eee",
    background: "#fff",
  }}
>
  {["👍", "❤️", "😂", "😍", "😮", "😢", "🙏", "🔥"].map((emoji) => (
    <span
      key={emoji}
      onClick={async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const existing = menuMessage.reactions?.find(
          (r: any) =>
            r.user_id === user.id &&
            r.emoji === emoji
        );

        if (existing) {
          await supabase
            .from("message_reactions")
            .delete()
            .eq("id", existing.id);
        } else {
          await supabase
            .from("message_reactions")
            .upsert({
              message_id: menuMessage.id,
              user_id: user.id,
              emoji,
            });
        }

        setShowMenu(false);
        await loadMessages();
      }}
     style={{
  cursor: "pointer",
  fontSize: "30px",
  transition: "transform .15s ease",
  userSelect: "none",
}}
    >
      {emoji}
    </span>
  ))}
</div>

      <div
        onClick={() => {
          setReplyMessage(menuMessage);

          setReplyPreview(
            menuMessage.message ||
              (menuMessage.image_url
                ? "📷 Photo"
                : menuMessage.audio_url
                ? "🎤 Voice message"
                : "")
          );

          setShowMenu(false);
        }}
        style={{
          padding: "16px",
          cursor: "pointer",
          borderBottom: "1px solid #eee",
        }}
      >
        ↩ Reply
      </div>

      <div
        onClick={() => {
          navigator.clipboard.writeText(menuMessage.message || "");
          setShowMenu(false);
        }}
        style={{
          padding: "16px",
          cursor: "pointer",
          borderBottom: "1px solid #eee",
        }}
      >
        📋 Copy
      </div>

      {menuMessage.sender_id === currentUser && (
        <>
          <div
            onClick={() => {
              setEditingId(menuMessage.id);
              setEditText(menuMessage.message);
              setShowMenu(false);
            }}
            style={{
              padding: "16px",
              cursor: "pointer",
              borderBottom: "1px solid #eee",
            }}
          >
            ✏ Edit
          </div>

          <div
            onClick={async () => {
              await supabase
                .from("messages")
                .delete()
                .eq("id", menuMessage.id);

              setShowMenu(false);
              await loadMessages();
            }}
            style={{
              padding: "16px",
              cursor: "pointer",
              color: "red",
            }}
          >
            🗑 Delete
          </div>
        </>
      )}
    </div>
  </div>
)}

</div>
      </div>
      <style jsx global>{`
@keyframes popup {
  from {
    opacity: 0;
    transform: translateX(-50%) scale(.8);
  }

  to {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
}
`}</style>
    </>
  );
}