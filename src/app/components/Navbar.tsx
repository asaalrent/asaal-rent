"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

export default function Navbar() {
  const router = useRouter();
const [notificationCount, setNotificationCount] = useState(0);
useEffect(() => {
  loadNotificationCount();
  const refresh = () => loadNotificationCount();

window.addEventListener("notification-read", refresh);

  const channel = supabase
    .channel("notifications")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
      },
      () => {
        loadNotificationCount();
      }
    )
    .subscribe();

  return () => {
  window.removeEventListener("notification-read", refresh);
  supabase.removeChannel(channel);
};
}, []);

async function loadNotificationCount() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { count } = await supabase
    .from("notifications")
     .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", user.id)
    .eq("is_read", false);
console.log("Notification Count =", count);
  setNotificationCount(count || 0);
}
  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav
      style={{
        background: "#16a34a",
        color: "white",
        padding: "15px 30px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <h2 style={{ margin: 0 }}>🚀 Asaal Rent</h2>

      <div
        style={{
          display: "flex",
          gap: "20px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Link href="/dashboard" style={{ color: "white", textDecoration: "none" }}>
          Dashboard
        </Link>

        <Link href="/upload" style={{ color: "white", textDecoration: "none" }}>
          Upload
        </Link>

        <Link href="/my-listings" style={{ color: "white", textDecoration: "none" }}>
          My Listings
        </Link>

        <Link href="/my-bookings" style={{ color: "white", textDecoration: "none" }}>
          My Bookings
        </Link>

        <Link
          href="/booking-requests"
          style={{ color: "white", textDecoration: "none" }}
        >
          Booking Requests
        </Link>

        <Link href="/profile" style={{ color: "white", textDecoration: "none" }}>
          Profile
        </Link>
        <Link
  href="/chat"
  style={{ color: "white", textDecoration: "none" }}
>
  💬 Chats
</Link>

<Link
  href="/wishlist"
  style={{ color: "white", textDecoration: "none" }}
>
  ❤️ Wishlist
</Link>

<Link
  href="/notifications"
  style={{
    color: "white",
    textDecoration: "none",
    position: "relative",
    display: "flex",
    alignItems: "center",
  }}
>
  🔔 Notifications

  {notificationCount > 0 && (
    <span
      style={{
        position: "absolute",
        top: "-8px",
        right: "-14px",
        background: "red",
        color: "white",
        borderRadius: "50%",
        minWidth: "20px",
        height: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: "bold",
      }}
    >
      {notificationCount}
    </span>
  )}
</Link>

        <button
          onClick={logout}
          style={{
            background: "red",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}