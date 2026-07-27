"use client";

import { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/app/lib/supabase";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  loadNotifications();

  const channel = supabase
    .channel("notifications-page")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
      },
      () => {
        loadNotifications();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
  async function loadNotifications() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }
    console.log("LOGGED IN USER =", user.id);

    // Load notifications
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
      console.log("NOTIFICATIONS =", data);

    if (error) {
      console.error("LOAD ERROR =", error);
      setLoading(false);
      return;
    }

    setNotifications(data || []);

    // Mark notifications as read
    const { data: updateData, error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
      .select();

    console.log("UPDATE DATA =", updateData);
    console.log("UPDATE ERROR =", updateError);

    setLoading(false);
  }

  return (
    <>
      <Navbar />

      <div
        style={{
          maxWidth: "900px",
          margin: "40px auto",
          padding: "20px",
        }}
      >
        <h1>🔔 Notifications</h1>

        {loading ? (
          <h3>Loading...</h3>
        ) : notifications.length === 0 ? (
          <h3>No notifications</h3>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                background: "white",
                padding: "18px",
                borderRadius: "12px",
                marginTop: "15px",
                boxShadow: "0 2px 10px rgba(0,0,0,.1)",
              }}
            >
              <h3>{notification.title}</h3>

              <p>{notification.message}</p>

              <small>
                {new Date(notification.created_at).toLocaleString()}
              </small>
            </div>
          ))
        )}
      </div>
    </>
  );
}