"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

export default function IncomingCallListener() {
  const router = useRouter();

  const channelRef =
    useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let mounted = true;

    async function setup() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) return;

      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase
        .channel(
          `global-incoming-calls-${user.id}-${crypto.randomUUID()}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "calls",
            filter: `receiver_id=eq.${user.id}`,
          },
          (payload) => {
            const call = payload.new as {
              id: string;
              receiver_id: string;
              status: string;
            };

            if (
              call.receiver_id !== user.id ||
              call.status !== "calling"
            ) {
              return;
            }

            const handledKey =
              `handled-incoming-call-${call.id}`;

            if (
              sessionStorage.getItem(handledKey)
            ) {
              return;
            }

            sessionStorage.setItem(
              handledKey,
              "1"
            );

            router.push(
              `/incoming-call/${call.id}`
            );
          }
        )
        .subscribe();

      channelRef.current = channel;
    }

    setup();

    return () => {
      mounted = false;

      const channel = channelRef.current;

      if (channel) {
        channelRef.current = null;

        supabase.removeChannel(channel);
      }
    };
  }, [router]);

  return null;
}