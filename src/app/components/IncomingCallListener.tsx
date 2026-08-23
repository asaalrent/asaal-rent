"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

export default function IncomingCallListener() {
  const router = useRouter();
  const pathname = usePathname();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function setup() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) return;

      currentUserIdRef.current = user.id;

      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase
        .channel(`global-incoming-calls-${user.id}`)
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

            if (!call) return;

            if (
              call.receiver_id !== user.id ||
              call.status !== "calling"
            ) {
              return;
            }

            // Already on incoming-call page for this call
            if (pathname === `/incoming-call/${call.id}`) {
              return;
            }

            // Don't reopen the same call repeatedly
            const handledKey = `handled-incoming-call-${call.id}`;

            if (sessionStorage.getItem(handledKey)) {
              return;
            }

            sessionStorage.setItem(handledKey, "1");

            router.push(`/incoming-call/${call.id}`);
          }
        )
        .subscribe();

      channelRef.current = channel;
    }

    setup();

    return () => {
      mounted = false;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      currentUserIdRef.current = null;
    };
  }, [router, pathname]);

  return null;
}