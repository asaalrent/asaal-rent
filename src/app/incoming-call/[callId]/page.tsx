"use client";

import { use, useEffect, useRef, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";

export default function IncomingCallPage({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const { callId } = use(params);
  const router = useRouter();

  const [call, setCall] = useState<any>(null);
  const [callerName, setCallerName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!callId) return;

    let cancelled = false;

    const ringtone = new Audio("/ring.mp3");
    ringtone.loop = true;
    ringtoneRef.current = ringtone;

    

    async function loadCall() {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .eq("id", callId)
        .single();

      

      if (cancelled) return;

      if (error || !data) {
        router.back();
        return;
      }

      if (
        data.status === "ended" ||
        data.status === "declined" ||
        data.status === "missed"
      ) {
        

        router.back();
        return;
      }

      setCall(data);

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("public_profiles")
        .select("*")
        .eq("id", data.caller_id)
        .single();

      
      

      if (cancelled) return;

      if (profile) {
        setCallerName(
          profile.full_name ||
            profile.name ||
            "User"
        );
      }

      ringtone.play().catch((error) => {
        
      });

      

      setLoading(false);
    }

    loadCall();

    // ==========================================
    // 🔥 REALTIME CALL STATUS LISTENER
    // ==========================================

    

    const channel = supabase
      .channel(`incoming-call-${callId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `id=eq.${callId}`,
        },
        (payload) => {
          

          const updatedCall =
            payload.new as any;

          

          setCall(updatedCall);

          if (
            updatedCall.status === "ended" ||
            updatedCall.status === "declined" ||
            updatedCall.status === "missed"
          ) {
            

            ringtone.pause();
            ringtone.currentTime = 0;

            setCall(null);

            router.back();
          }
        }
      )
      .subscribe((status) => {
        
      });

    // ==========================================
    // CLEANUP
    // ==========================================

    return () => {
      cancelled = true;

      

      ringtone.pause();
      ringtone.currentTime = 0;

      ringtoneRef.current = null;

      

      supabase.removeChannel(channel);
    };
  }, [callId, router]);

  // ==========================================
  // 📞 ACCEPT CALL
  // ==========================================

  async function acceptCall() {
  if (!call || processing) return;

  setProcessing(true);

  

  const { data, error } = await supabase
    .from("calls")
    .select("id, status, conversation_id")
    .eq("id", call.id)
    .single();

  

  if (error || !data) {
    alert("Call no longer exists.");
    setProcessing(false);
    return;
  }

  if (
    data.status !== "calling" &&
    data.status !== "answered"
  ) {
    

    setProcessing(false);
    router.back();
    return;
  }

  if (ringtoneRef.current) {
    ringtoneRef.current.pause();
    ringtoneRef.current.currentTime = 0;
    ringtoneRef.current = null;
  }
const { error: answerTimeError } = await supabase
  .from("calls")
  .update({
    answered_at: new Date().toISOString(),
  })
  .eq("id", data.id)
  .eq("status", "calling");



  

  router.push(
    `/call/${data.conversation_id}`
  );
}

  // ==========================================
  // ❌ DECLINE CALL
  // ==========================================

  async function declineCall() {
    if (!call || processing) return;

    setProcessing(true);

    

    const { error } = await supabase
      .from("calls")
      .update({
        status: "declined",
      })
      .eq("id", call.id)
      .eq("status", "calling");

    

    if (error) {
      alert(error.message);
      setProcessing(false);
      return;
    }

    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }

    router.push(
      `/chat/${call.conversation_id}`
    );
  }

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#111",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
        }}
      >
        Loading...
      </div>
    );
  }

  // ==========================================
  // NO ACTIVE CALL
  // ==========================================

  if (!call) {
    return null;
  }

 // ==========================================
// 📞 INCOMING CALL UI
// ==========================================

return (
  <div
    style={{
      minHeight: "100vh",
      background:
        "radial-gradient(circle at top, #1f2937 0%, #030712 55%, #000 100%)",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: "420px",
        textAlign: "center",
      }}
    >
      {/* CALL ICON */}

      <div
        style={{
          position: "relative",
          width: "150px",
          height: "150px",
          margin: "0 auto 30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Ring animation */}

        <div
          style={{
            position: "absolute",
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            border: "2px solid rgba(34,197,94,0.25)",
            animation: "callPulse 1.8s infinite",
          }}
        />

        <div
          style={{
            position: "absolute",
            width: "125px",
            height: "125px",
            borderRadius: "50%",
            border: "2px solid rgba(34,197,94,0.35)",
            animation: "callPulse 1.8s infinite 0.4s",
          }}
        />

        {/* Avatar */}

        <div
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, #22c55e, #15803d)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "42px",
            boxShadow:
              "0 10px 40px rgba(34,197,94,0.35)",
            zIndex: 2,
          }}
        >
          👤
        </div>
      </div>

      {/* TITLE */}

      <p
        style={{
          margin: "0 0 8px",
          color: "#22c55e",
          fontSize: "14px",
          fontWeight: "600",
          letterSpacing: "1px",
          textTransform: "uppercase",
        }}
      >
        Incoming Call
      </p>

      {/* CALLER NAME */}

      <h1
        style={{
          margin: "0 0 10px",
          fontSize: "32px",
          fontWeight: "700",
        }}
      >
        {callerName}
      </h1>

      <p
        style={{
          margin: "0 0 65px",
          color: "#9ca3af",
          fontSize: "16px",
        }}
      >
        is calling you...
      </p>

      {/* BUTTONS */}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: "70px",
        }}
      >
        {/* DECLINE */}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <button
            onClick={declineCall}
            disabled={processing}
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "50%",
              border: "none",
              background: "#ef4444",
              color: "white",
              fontSize: "30px",
              cursor: processing
                ? "not-allowed"
                : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: processing ? 0.6 : 1,
              boxShadow:
                "0 10px 30px rgba(239,68,68,0.35)",
              transition:
                "transform 0.15s ease",
            }}
          >
            📵
          </button>

          <span
            style={{
              marginTop: "12px",
              color: "#d1d5db",
              fontSize: "14px",
            }}
          >
            Decline
          </span>
        </div>

        {/* ACCEPT */}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <button
            onClick={acceptCall}
            disabled={processing}
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "50%",
              border: "none",
              background: "#22c55e",
              color: "white",
              fontSize: "30px",
              cursor: processing
                ? "not-allowed"
                : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: processing ? 0.6 : 1,
              boxShadow:
                "0 10px 30px rgba(34,197,94,0.35)",
              transition:
                "transform 0.15s ease",
            }}
          >
            📞
          </button>

          <span
            style={{
              marginTop: "12px",
              color: "#d1d5db",
              fontSize: "14px",
            }}
          >
            Accept
          </span>
        </div>
      </div>
    </div>

    {/* ANIMATION */}

    <style jsx>{`
      @keyframes callPulse {
        0% {
          transform: scale(0.85);
          opacity: 0.8;
        }

        70% {
          transform: scale(1.15);
          opacity: 0;
        }

        100% {
          transform: scale(1.15);
          opacity: 0;
        }
      }
    `}</style>
  </div>
);
}