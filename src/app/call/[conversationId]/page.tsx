"use client";

import { supabase } from "@/app/lib/supabase";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function CallPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
    
  const { conversationId } = use(params);
  const router = useRouter();
  const localAudio = useRef<HTMLAudioElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
const peerConnection = useRef<RTCPeerConnection | null>(null);
const initializingRef = useRef(false);
const currentCallId = useRef<string | null>(null);
const endingCallRef = useRef(false);
const candidateChannelRef =
  useRef<ReturnType<typeof supabase.channel> | null>(null);
const [callStatus, setCallStatus] = useState("connecting");
const [muted, setMuted] = useState(false);
const [callDuration, setCallDuration] = useState(0);
const [otherUser, setOtherUser] = useState<any>(null);
const [speakerOn, setSpeakerOn] = useState(false);

const isCaller = useRef(false);
const isProcessingOffer = useRef(false);
const pendingCandidates = useRef<RTCIceCandidate[]>([]);

const configuration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

async function createReceiverAnswer(callData: any) {
  if (!peerConnection.current) return;
  if (!callData?.offer) return;
  if (isCaller.current) return;

  if (isProcessingOffer.current) {
    
    return;
  }

  if (peerConnection.current.currentRemoteDescription) {
    
    return;
  }

  isProcessingOffer.current = true;

  try {
    ;

    await peerConnection.current.setRemoteDescription(
      JSON.parse(callData.offer)
    );

    

    for (const candidate of pendingCandidates.current) {
      try {
        const iceCandidate =
          candidate instanceof RTCIceCandidate
            ? candidate
            : new RTCIceCandidate(candidate);

        await peerConnection.current.addIceCandidate(
          iceCandidate
        );

        
      } catch (err) {
        
      }
    }

    pendingCandidates.current = [];

    const answer =
      await peerConnection.current.createAnswer();

    await peerConnection.current.setLocalDescription(
      answer
    );

    

    

    const { data, error } = await supabase
      .from("calls")
      .update({
        answer: JSON.stringify(
          peerConnection.current.localDescription
        ),
        status: "answered",
      })
      .eq("id", callData.id)
      .select();

    
  } catch (error) {
    console.error(
      "❌ RECEIVER ANSWER ERROR =",
      error
    );
  } finally {
    isProcessingOffer.current = false;
  }
}

useEffect(() => {
  let stream: MediaStream;
  let cancelled = false;

  let missedCallTimer: ReturnType<typeof setTimeout> | null = null;

  async function startAudio() {

  if (cancelled) return;

  if (initializingRef.current) {
    
    return;
  }

  initializingRef.current = true;

  const devices = await navigator.mediaDevices.enumerateDevices();

  

  if (cancelled) return;
    try {
  stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
});

if (cancelled) {
  stream.getTracks().forEach((track) => track.stop());
  return;
}
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
if (!user) return;
if (cancelled) return;

const { data: conversation, error: conversationError } =
  await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();



if (cancelled) return;

if (conversation) {
  const otherUserId =
    conversation.owner_id === user.id
      ? conversation.buyer_id
      : conversation.owner_id;

  const { data: profile, error: profileError } =
    await supabase
      .from("public_profiles")
      .select("*")
      .eq("id", otherUserId)
      .single();

  
  

  setOtherUser(profile);
}

const { data: call } = await supabase
  .from("calls")
  .select("*")
  .eq("conversation_id", conversationId)
  .order("created_at", { ascending: false })
  .limit(1)
  .single();

  if (cancelled) return;

  if (!call) {
  
  return;
}



currentCallId.current = call.id;





isCaller.current = call.caller_id === user.id;

const candidateChannel = supabase
  .channel(`candidates-${call.id}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "call_candidates",
      filter: `call_id=eq.${call.id}`,
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
        if (!peerConnection.current.remoteDescription) {
          

          pendingCandidates.current.push(
            new RTCIceCandidate(candidate.candidate)
          );

          return;
        }

        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate.candidate)
        );

        
      } catch (err) {
        
      }
    }
  )
  .subscribe((status) => {
    
  });
  candidateChannelRef.current = candidateChannel;



if (!isCaller.current && call?.offer) {
  
}


    if (localAudio.current) {
      localAudio.current.srcObject = stream;
    }
    peerConnection.current = new RTCPeerConnection(configuration);

   peerConnection.current.onconnectionstatechange = () => {
  const state = peerConnection.current?.connectionState;

  

  if (state === "connecting") {
    setCallStatus("connecting");
  }

  if (state === "connected") {
    setCallStatus("connected");
  }

  if (state === "disconnected") {
    setCallStatus("disconnected");
  }

  if (state === "failed") {
    setCallStatus("failed");
  }

  if (state === "closed") {
    setCallStatus("ended");
  }
};

peerConnection.current.oniceconnectionstatechange = () => {
  
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

  const callId = currentCallId.current;

if (!callId) {
  
  return;
}

const { error } = await supabase
  .from("call_candidates")
  .insert({
    call_id: callId,
    user_id: user.id,
    candidate: event.candidate.toJSON(),
  });



  
};

peerConnection.current.ontrack = async (event) => {
  

  if (!remoteAudio.current) {
    
    return;
  }

  remoteAudio.current.srcObject = event.streams[0];

  try {
    await remoteAudio.current.play();
    
  } catch (err) {
    console.error("❌ REMOTE AUDIO PLAY ERROR =", err);
  }
};



if (!isCaller.current && call?.offer) {
  await createReceiverAnswer(call);
}

if (isCaller.current) {
  const offer = await peerConnection.current.createOffer();

  await peerConnection.current.setLocalDescription(offer);

  

  const { data, error } = await supabase
    .from("calls")
    .update({
      offer: JSON.stringify(peerConnection.current.localDescription),
    })
    .eq("id", currentCallId.current)
    .select();

  
}


  }

 startAudio();

// ==========================================
// ⏰ 30 SECOND MISSED CALL TIMER
// ==========================================

missedCallTimer = setTimeout(async () => {
  if (endingCallRef.current) {
    
    return;
  }

  const callId = currentCallId.current;

  

  if (!callId) {
    
    return;
  }

  const { data: currentCall, error: fetchError } =
    await supabase
      .from("calls")
      .select("status")
      .eq("id", callId)
      .single();

  

  

  if (
    !currentCall ||
    currentCall.status !== "calling"
  ) {
    
    return;
  }

  endingCallRef.current = true;

  

  const { data, error } = await supabase
    .from("calls")
    .update({
      status: "missed",
      ended_at: new Date().toISOString(),
    })
    .eq("id", callId)
    .eq("status", "calling")
    .select();

  

  

  await cleanupCall();

setCallStatus("ended");

router.push(`/chat/${conversationId}`);
}, 30000);

const endCallChannel = supabase
  .channel(`call-end-${conversationId}`)
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "calls",
      filter: `conversation_id=eq.${conversationId}`,
    },
    async (payload) => {
      const updatedCall = payload.new as any;

      
      if (updatedCall.id !== currentCallId.current) {
  
  return;
}

      if (
  updatedCall.status !== "ended" &&
  updatedCall.status !== "declined" &&
  updatedCall.status !== "missed"
) {
  return;
}

      if (
  updatedCall.status === "ended" ||
  updatedCall.status === "declined" ||
  updatedCall.status === "missed"
) {
  if (endingCallRef.current) {
    return;
  }

  endingCallRef.current = true;

  

  await cleanupCall();

  setCallDuration(0);
  setCallStatus("ended");

  router.push(`/chat/${conversationId}`);
}
    }
  )
  .subscribe((status) => {
    
  });



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
      

      // FIRST declare updatedCall
      const updatedCall = payload.new as any;

      // Ignore old call updates
      if (updatedCall.id !== currentCallId.current) {
        
        return;
      }

      // ==========================================
      // 🟢 CALLER RECEIVES ANSWER
      // ==========================================

      if (
        isCaller.current &&
        updatedCall.answer &&
        peerConnection.current &&
        !peerConnection.current.currentRemoteDescription
      ) {
        ;

        if (
          peerConnection.current.signalingState === "closed"
        ) {
          
          return;
        }

        try {
          await peerConnection.current.setRemoteDescription(
            JSON.parse(updatedCall.answer)
          );

          
        } catch (error) {
          console.error(
            "❌ SET REMOTE ANSWER ERROR =",
            error
          );
        }
      }

      // ==========================================
      // 🟢 RECEIVER RECEIVES OFFER
      // ==========================================

      if (
        !isCaller.current &&
        updatedCall.offer &&
        peerConnection.current &&
        !peerConnection.current.currentRemoteDescription
      ) {
        

        await createReceiverAnswer(updatedCall);
      }
    }
  )
  .subscribe((status) => {
    
  });

  
 

  return () => {
  cancelled = true;
  initializingRef.current = false;

  // ⏰ Cancel missed-call timer
  if (missedCallTimer) {
    clearTimeout(missedCallTimer);
  }

  // Remove call channels
  supabase.removeChannel(channel);
  supabase.removeChannel(endCallChannel);

  // Remove ICE candidate channel
  const candidateChannel = candidateChannelRef.current;

  if (candidateChannel) {
    supabase.removeChannel(candidateChannel);
    candidateChannelRef.current = null;
  }

  // Stop microphone
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  }

  // Close WebRTC
  peerConnection.current?.close();
  peerConnection.current = null;
};
}, []);

async function cleanupCall() {
  

  if (remoteAudio.current) {
    remoteAudio.current.pause();
    remoteAudio.current.srcObject = null;
  }

  if (localAudio.current) {
    localAudio.current.pause();
    localAudio.current.srcObject = null;
  }

  if (candidateChannelRef.current) {
    

    await supabase.removeChannel(candidateChannelRef.current);

    candidateChannelRef.current = null;
  }

  peerConnection.current?.getSenders().forEach((sender) => {
    sender.track?.stop();
  });

  peerConnection.current?.close();
  peerConnection.current = null;

  
}

function toggleMute() {
  const pc = peerConnection.current;

  if (!pc) return;

  const newMuted = !muted;

  pc.getSenders().forEach((sender) => {
    if (sender.track?.kind === "audio") {
      sender.track.enabled = !newMuted;
    }
  });

  setMuted(newMuted);
}
async function toggleSpeaker() {
  const audio = remoteAudio.current;

  if (!audio) return;

  const newSpeakerState = !speakerOn;

  try {
    const audioElement = audio as HTMLAudioElement & {
      setSinkId?: (sinkId: string) => Promise<void>;
    };

    if (audioElement.setSinkId) {
      const devices =
        await navigator.mediaDevices.enumerateDevices();

      const audioOutputs = devices.filter(
        (device) => device.kind === "audiooutput"
      );

      

      if (
        newSpeakerState &&
        audioOutputs.length > 0
      ) {
        await audioElement.setSinkId(
          audioOutputs[0].deviceId
        );
      } else {
        await audioElement.setSinkId("");
      }
    }

    setSpeakerOn(newSpeakerState);
  } catch (error) {
    console.error("SPEAKER ERROR =", error);
  }
}

useEffect(() => {
  if (callStatus !== "connected") return;

  const timer = setInterval(() => {
    setCallDuration((prev) => prev + 1);
  }, 1000);

  return () => {
    clearInterval(timer);
  };
}, [callStatus]);

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
    2,
    "0"
  )}`;
}

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
      <div style={{ fontSize: "60px" }}>
  📞
</div>

<h2 style={{ margin: "0" }}>
  {otherUser?.full_name ||
    otherUser?.name ||
    "User"}
</h2>

<p>
  {callStatus === "connecting" && "📞 Connecting..."}
  {callStatus === "connected" && "🟢 Connected"}
  {callStatus === "disconnected" && "⚠️ Disconnected"}
  {callStatus === "failed" && "❌ Call Failed"}
  {callStatus === "ended" && "📴 Call Ended"}
</p>

{callStatus === "connected" && (
  <p
    style={{
      fontSize: "20px",
      fontWeight: "bold",
      margin: "5px 0",
    }}
  >
    {formatDuration(callDuration)}
  </p>
)}

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
  playsInline
/>

<button
  onClick={toggleMute}
  style={{
    padding: "15px 25px",
    background: muted ? "#6b7280" : "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    marginBottom: "10px",
  }}
>
  {muted ? "🔇 Unmute" : "🎤 Mute"}
</button>

<button
  onClick={toggleSpeaker}
  style={{
    padding: "15px 25px",
    background: speakerOn ? "#16a34a" : "#6b7280",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    marginBottom: "10px",
  }}
>
  {speakerOn ? "🔊 Speaker On" : "🔈 Speaker Off"}
</button>

 <button
  onClick={async () => {
    if (endingCallRef.current) {
      
      return;
    }

    endingCallRef.current = true;

    

    const callId = currentCallId.current;

    

    if (!callId) {
      

      await cleanupCall();

      router.push(`/chat/${conversationId}`);

      return;
    }

    const { data, error } = await supabase
      .from("calls")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
      })
      .eq("id", callId)
      .select();

    
    

    await cleanupCall();

    setCallStatus("ended");

    router.push(`/chat/${conversationId}`);
  }}
  style={{
    padding: "15px 25px",
    background: "red",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
  }}
>
  End Call
</button>

    </div>
  );
}