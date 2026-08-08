"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";

export default function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    loadCount();

    const channel = supabase
      .channel("notification-bell")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadCount();
        }
      )
      .subscribe();

    window.addEventListener("notification-read", loadCount);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("notification-read", loadCount);
    };
  }, []);

  async function loadCount() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { count } = await supabase
      .from("notifications")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setCount(count || 0);
  }

  return (
    <Link
      href="/notifications"
      style={{
        position: "relative",
        textDecoration: "none",
        fontSize: "28px",
      }}
    >
      🔔

      {count > 0 && (
        <span
          style={{
            position: "absolute",
            top: "-8px",
            right: "-10px",
            background: "red",
            color: "white",
            borderRadius: "50%",
            width: "22px",
            height: "22px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          {count}
        </span>
      )}
    </Link>
  );
}