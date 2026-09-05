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

  // 👤 Other user online / typing
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
  )

  // 💬 New message
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `conversation_id=eq.${conversationId}`,
    },
    async (payload) => {
      

      await loadMessages();
    }
  )

  // ✏️ Edited message
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "messages",
      filter: `conversation_id=eq.${conversationId}`,
    },
    async (payload) => {
      

      await loadMessages();
    }
  )

  // 🗑️ Deleted message
  .on(
    "postgres_changes",
    {
      event: "DELETE",
      schema: "public",
      table: "messages",
      filter: `conversation_id=eq.${conversationId}`,
    },
    async (payload) => {
      

      await loadMessages();
    }
  )

    // 📞 Call history realtime
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "calls",
      filter: `conversation_id=eq.${conversationId}`,
    },
    async () => {
      await loadMessages();
    }
  );

await channel.subscribe((status) => {
  
});

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
    const { data: calls, error: callsError } = await supabase
  .from("calls")
  .select(`
    id,
    conversation_id,
    caller_id,
    receiver_id,
    call_type,
    status,
    created_at,
    ended_at,
    answer
  `)
  .eq("conversation_id", conversationId)
  .order("created_at", { ascending: true });

if (callsError) {
  console.error("CALL HISTORY LOAD ERROR =", callsError);
}

  if (error) {
  
  

  alert(
    `Message Load Error\n\n${error.message}\n\nCode: ${error.code}`
  );

  return;
}
  const {
  data: { user },
} = await supabase.auth.getUser();


  const messageRows = (data || []).map((msg) => ({
  ...msg,
  is_call: false,
}));

const callRows = (calls || []).map((call) => ({
  id: `call-${call.id}`,
  is_call: true,

  call_id: call.id,
  conversation_id: call.conversation_id,

  caller_id: call.caller_id,
  receiver_id: call.receiver_id,

  call_type: call.call_type,
  status: call.status,

  created_at: call.created_at,
  started_at: call.created_at,
  ended_at: call.ended_at,

  answer: call.answer,

  // Normal message fields
  message: null,
  image_url: null,
  audio_url: null,
  file_url: null,
  file_name: null,
  file_type: null,
  latitude: null,
  longitude: null,
  reply_to: null,
  reply: null,
  reactions: [],
  is_read: true,
  is_edited: false,
}));

const combinedRows = [
  ...messageRows,
  ...callRows,
].sort(
  (a, b) =>
    new Date(a.created_at).getTime() -
    new Date(b.created_at).getTime()
);

setMessages(combinedRows);
  
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
  .from("public_profiles")
  .select("*")
  .eq("id", otherUserId)
  .single();

    

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

  const { data: newCall, error } = await supabase
  .from("calls")
  .insert({
    conversation_id: conversationId,
    caller_id: user.id,
    receiver_id: receiverId,
    call_type: "voice",
    status: "calling",
  })
  .select()
  .single();



  



  

  if (error) {
    alert(error.message);
    return;
  }
  
router.push(`/call/${conversationId}`);

  
}


async function sendMessage() {

    
   
 if (!message.trim() && !image && !audio && !file) return;

  setSending(true);
  let imageUrl = null;
  let audioUrl = null;

  let fileUrl = null;
let fileName = null;
let fileType = null;

if (image) {
  

const fileName = `${Date.now()}-${image.name}`;



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
  

if (!conversation) {
  alert("Conversation not found");
  setSending(false);
  return;
}

const receiverId =
  conversation.owner_id === user.id
    ? conversation.buyer_id
    : conversation.owner_id;
    

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

    


    const { error: notificationError } =
  await supabase.rpc("create_notification", {
    p_user_id: receiverId,
    p_title: "💬 New Message",
    p_message: "You received a new message.",
  });



const { error: conversationError } = await supabase
  .from("conversations")
  .update({
    last_message: message,
    last_message_at: new Date().toISOString(),
  })
  .eq("id", conversationId);




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

   const messageDate = new Date(msg.created_at);

  const currentDate = messageDate.toDateString();

  const previousDate =
    index > 0
      ? new Date(messages[index - 1].created_at).toDateString()
      : null;

  const showDate =
    index === 0 || currentDate !== previousDate;

  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(yesterday.getDate() - 1);

  let dateLabel = messageDate.toLocaleDateString([], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (
    messageDate.toDateString() ===
    today.toDateString()
  ) {
    dateLabel = "Today";
  } else if (
    messageDate.toDateString() ===
    yesterday.toDateString()
  ) {
    dateLabel = "Yesterday";
  }

  if (msg.is_call) {
  const isCaller = msg.caller_id === currentUser;
  const answered = Boolean(msg.answer);

  let title = "";
  let icon = "📞";
  let color = "#374151";

  if (msg.status === "missed") {
    title = "Missed call";
    icon = "❌";
    color = "#dc2626";
  } else if (msg.status === "declined") {
    title = "Declined call";
    icon = "🚫";
    color = "#dc2626";
  } else if (msg.status === "ended") {
    if (answered) {
      title = isCaller
        ? "Outgoing call"
        : "Incoming call";
    } else {
      title = isCaller
        ? "Canceled call"
        : "Missed call";

      icon = isCaller ? "📵" : "❌";
      color = "#dc2626";
    }
  } else {
    title = isCaller
      ? "Outgoing call"
      : "Incoming call";
  }

  let durationText = "";

  if (
    answered &&
    msg.started_at &&
    msg.ended_at
  ) {
    const durationSeconds = Math.max(
      0,
      Math.floor(
        (
          new Date(msg.ended_at).getTime() -
          new Date(msg.started_at).getTime()
        ) / 1000
      )
    );

    const minutes = Math.floor(
      durationSeconds / 60
    );

    const seconds = durationSeconds % 60;

    durationText =
      `${String(minutes).padStart(2, "0")}:${String(
        seconds
      ).padStart(2, "0")}`;
  }

  return (
    <div key={msg.id}>
      <div
        style={{
          display: "flex",
          justifyContent: isCaller
            ? "flex-end"
            : "flex-start",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
            padding: "7px 10px",
            borderRadius: "12px",
            maxWidth: "70%",
            background: "transparent",
          }}
        >
          <span
            style={{
              fontSize: "18px",
              color,
            }}
          >
            {icon}
          </span>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color,
              }}
            >
              {title}
            </div>

            {durationText && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginTop: "2px",
                }}
              >
                Call duration · {durationText}
              </div>
            )}
          </div>

          <span
            style={{
              fontSize: "11px",
              color: "#9ca3af",
              marginLeft: "4px",
              whiteSpace: "nowrap",
              alignSelf: "flex-end",
            }}
          >
            {new Date(
              msg.created_at
            ).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
  



 return (
  <div key={msg.id}>
    {showDate && (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          margin: "16px 0",
        }}
      >
        <span
          style={{
            background: "#e5e7eb",
            color: "#555",
            padding: "6px 14px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          {dateLabel}
        </span>
      </div>
    )}

    {showDate && (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      margin: "16px 0",
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

  await supabase
  .from("profiles")
  .update({
    is_typing: true,
  })
  .eq("id", user.id);



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