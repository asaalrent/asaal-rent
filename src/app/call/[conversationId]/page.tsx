"use client";

import { supabase } from "@/app/lib/supabase";
import { use, useEffect, useRef } from "react";

export default function CallPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
    
  const { conversationId } = use(params);
  const localAudio = useRef<HTMLAudioElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
const peerConnection = useRef<RTCPeerConnection | null>(null);
const isCaller = useRef(false);

const configuration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

useEffect(() => {
  let stream: MediaStream;

  async function startAudio() {

    const devices = await navigator.mediaDevices.enumerateDevices();

console.log("DEVICES =", devices);
    try {
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
} catch (err) {
  console.error("MIC ERROR =", err);

  alert(
    "Microphone not found. Connect a microphone or headset first."
  );

  return;
}

    const {
  data: { user },
} = await supabase.auth.getUser();

const { data: call } = await supabase
  .from("calls")
  .select("*")
  .eq("conversation_id", conversationId)
  .order("created_at", { ascending: false })
  .limit(1)
  .single();

isCaller.current = call?.caller_id === user?.id;

    if (localAudio.current) {
      localAudio.current.srcObject = stream;
    }
    peerConnection.current = new RTCPeerConnection(configuration);

    peerConnection.current.onconnectionstatechange = () => {
  console.log(
    "CONNECTION STATE =",
    peerConnection.current?.connectionState
  );
};

peerConnection.current.oniceconnectionstatechange = () => {
  console.log(
    "ICE STATE =",
    peerConnection.current?.iceConnectionState
  );
};

stream.getTracks().forEach((track) => {
  peerConnection.current?.addTrack(track, stream);
});

peerConnection.current.onicecandidate = async (event) => {
  if (!event.candidate) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: call } = await supabase
    .from("calls")
    .select("id")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!call) return;

  const { error } = await supabase
    .from("call_candidates")
    .insert({
      call_id: call.id,
      user_id: user.id,
      candidate: event.candidate,
    });

  console.log("ICE INSERT ERROR =", error);
};

peerConnection.current.ontrack = (event) => {

    console.log("REMOTE AUDIO RECEIVED");
  if (remoteAudio.current) {
    remoteAudio.current.srcObject = event.streams[0];
    remoteAudio.current.play().catch(console.error);
  }
};
if (isCaller.current) {
  const offer = await peerConnection.current.createOffer();

  await peerConnection.current.setLocalDescription(offer);

  const { data, error } = await supabase
    .from("calls")
    .update({
      offer: JSON.stringify(peerConnection.current.localDescription),
    })
    .eq("conversation_id", conversationId)
    .eq("status", "calling")
    .select();

  console.log("UPDATE DATA =", data);
  console.log("UPDATE ERROR =", error);
}

console.log("STEP-3");
  }

  startAudio();

console.log("CREATING CALL CHANNEL");
  const channel = supabase
  .channel(`call-${conversationId}`)
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "calls",
      filter: `conversation_id=eq.${conversationId}`,
    },
    async (payload) => {

      console.log("CALL UPDATE =", payload);

        

      const call = payload.new as any;

      if (
  isCaller.current &&
  call.answer &&
  peerConnection.current &&
  !peerConnection.current.currentRemoteDescription
) {
  await peerConnection.current.setRemoteDescription(
    JSON.parse(call.answer)
  );

  console.log("✅ CALL CONNECTED");

  return;
}

     // Sirf receiver answer banayega
if (!isCaller.current) {
  if (
    call.conversation_id !== conversationId ||
    !call.offer ||
    !peerConnection.current
  ) {
    return;
  }

  if (!peerConnection.current.currentRemoteDescription) {
    await peerConnection.current.setRemoteDescription(
      JSON.parse(call.offer)
    );

    const answer = await peerConnection.current.createAnswer();

    await peerConnection.current.setLocalDescription(answer);

    await supabase
      .from("calls")
      .update({
        answer: JSON.stringify(peerConnection.current.localDescription),
        status: "answered",
      })
      .eq("id", call.id);

    console.log("STEP-4");
  }
}
    }
  )
  .subscribe((status) => {
  console.log("CALL CHANNEL STATUS =", status);
});

  const candidateChannel = supabase
  .channel(`candidates-${conversationId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "call_candidates",
    },
    async (payload) => {
      const candidate = payload.new as any;

      if (!peerConnection.current) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      if (candidate.user_id === user.id) return;

      try {
        await peerConnection.current.addIceCandidate(candidate.candidate);

        console.log("ICE ADDED");
      } catch (err) {
        console.log("ICE ERROR =", err);
      }
    }
  )
  .subscribe();
 

  return () => {

  supabase.removeChannel(channel);
  supabase.removeChannel(candidateChannel);

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
};

}, []);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <h1>📞 Voice Call</h1>

      <p>Conversation ID:</p>

      <b>{conversationId}</b>

      <audio
  ref={localAudio}
  autoPlay
  muted
/>
<audio
  ref={remoteAudio}
  autoPlay
/>

     <button
  onClick={async () => {
    peerConnection.current?.close();

    await supabase
      .from("calls")
      .update({
        status: "ended",
      })
      .eq("conversation_id", conversationId);

    window.history.back();
  }}
  style={{
    padding: "15px 25px",
    background: "red",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
  }}
>
  End Call
</button>
    </div>
  );
}