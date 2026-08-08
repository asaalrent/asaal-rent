"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

export default function IncomingCall({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const { callId } = use(params);

  const router = useRouter();
  const [call, setCall] = useState<any>(null);
const [caller, setCaller] = useState<any>(null);
const ringtone = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
  async function loadCall() {
  const { data } = await supabase
    .from("calls")
    .select("*")
    .eq("id", callId)
    .single();

  if (!data) return;

  setCall(data);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.caller_id)
    .single();

  setCaller(profile);

  console.log("CALL =", data);
  console.log("CALLER =", profile);
}

ringtone.current = new Audio("/ring.mp3");

ringtone.current.loop = true;

ringtone.current.play().catch(() => {});

  loadCall();
}, [callId]);

useEffect(() => {
  const channel = supabase
    .channel(`incoming-${callId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "calls",
      },
      (payload) => {
        const updatedCall = payload.new as any;

        if (updatedCall.id !== callId) return;

        if (
          updatedCall.status === "declined" ||
          updatedCall.status === "ended" ||
          updatedCall.status === "missed"
        ) {
          alert("Call Ended");
          router.back();
        }
      }
    )
    .subscribe();

  return () => {
    ringtone.current?.pause();
ringtone.current = null;
    supabase.removeChannel(channel);
  };
}, [callId]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        background: "#111827",
        color: "white",
      }}
    >
      <h1>📞 Incoming Voice Call</h1>

<h2>{caller?.full_name || "Unknown User"}</h2>

<p>Calling...</p>

      <div
        style={{
          display: "flex",
          gap: "30px",
          marginTop: "40px",
        }}
      >
        <button
         onClick={async () => {

          ringtone.current?.pause();

  if (!call) return;

  await supabase
    .from("calls")
    .update({
      status: "answered",
    })
    .eq("id", call.id);

  router.push(`/call/${call.conversation_id}`);
}}
          style={{
            background: "green",
            color: "white",
            border: "none",
            padding: "18px 30px",
            borderRadius: "50px",
            fontSize: "20px",
            cursor: "pointer",
          }}
        >
          ✅ Accept
        </button>

        <button
         onClick={async () => {
          ringtone.current?.pause();
  if (!call) return;

  await supabase
    .from("calls")
    .update({
      status: "declined",
    })
    .eq("id", call.id);

  router.back();
}}
          style={{
            background: "red",
            color: "white",
            border: "none",
            padding: "18px 30px",
            borderRadius: "50px",
            fontSize: "20px",
            cursor: "pointer",
          }}
        >
          ❌ Decline
        </button>
      </div>
    </div>
  );
}