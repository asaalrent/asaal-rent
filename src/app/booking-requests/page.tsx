"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/app/lib/supabase";
import BookingStatus from "@/app/components/BookingStatus";

export default function BookingRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please login first");
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          items (
            id,
            title,
            image_url,
            location,
            price
          ),
          renter:profiles!bookings_renter_id_fkey (
            full_name,
            email
          )
        `)
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      setRequests(data || []);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please login first");
      return;
    }

    const { data: booking, error: updateError } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id)
      .eq("owner_id", user.id)
      .select()
      .single();

    if (updateError) {
      alert(updateError.message);
      return;
    }

    let conversationId = booking.conversation_id;
    if (status === "Accepted") {
  const { error: itemError } = await supabase
    .from("items")
    .update({
      available: false,
    })
    .eq("id", booking.item_id);

  if (itemError) {
    alert(itemError.message);
    return;
  }
}

    if (status === "Accepted" && !conversationId) {
      const { data: existingConversation, error: existingError } = await supabase
        .from("conversations")
        .select("id")
        .eq("item_id", booking.item_id)
        .eq("owner_id", booking.owner_id)
        .eq("buyer_id", booking.renter_id)
        .maybeSingle();

      if (existingError) {
        alert(existingError.message);
        return;
      }

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        const { data: conversation, error: conversationError } = await supabase
          .from("conversations")
          .insert({
            item_id: booking.item_id,
            owner_id: booking.owner_id,
            buyer_id: booking.renter_id,
          })
          .select()
          .single();

        if (conversationError) {
          alert(conversationError.message);
          return;
        }

        conversationId = conversation.id;
      }

      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          conversation_id: conversationId,
        })
        .eq("id", booking.id)
        .eq("owner_id", user.id);

      if (bookingError) {
        alert(bookingError.message);
        return;
      }
    }

    const { error: notificationError } = await supabase.from("notifications").insert([
      {
        user_id: booking.renter_id,
        title: `Booking ${status}`,
        message:
          status === "Accepted"
            ? "🎉 Your booking request has been accepted."
            : "❌ Your booking request has been rejected.",
      },
    ]);

    if (notificationError) {
      alert(notificationError.message);
      return;
    }

    await loadRequests();
  }

  return (
    <>
      <Navbar />

      <div
        style={{
          maxWidth: "1200px",
          margin: "30px auto",
          padding: "20px",
        }}
      >
        <h1>📋 Booking Requests</h1>

        {loading ? (
          <h3>Loading...</h3>
        ) : requests.length === 0 ? (
          <h3>No booking requests.</h3>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
              gap: "20px",
              marginTop: "30px",
            }}
          >
            {requests.map((booking) => (
              <div
                key={booking.id}
                style={{
                  background: "white",
                  borderRadius: "15px",
                  overflow: "hidden",
                  boxShadow: "0 2px 10px rgba(0,0,0,.1)",
                }}
              >
                <img
                  src={booking.items.image_url}
                  alt={booking.items.title}
                  style={{
                    width: "100%",
                    height: "220px",
                    objectFit: "cover",
                  }}
                />

                <div style={{ padding: "15px" }}>
                  <h3>{booking.items.title}</h3>

                  <p>👤 {booking.renter?.full_name || "Unknown User"}</p>

                  <p>📧 {booking.renter?.email}</p>

                  <p>
                    📅 {booking.start_date} → {booking.end_date}
                  </p>

                  <BookingStatus status={booking.status} />

                  {booking.status === "Pending" && (
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        marginTop: "20px",
                      }}
                    >
                      <button
                        onClick={() => updateStatus(booking.id, "Accepted")}
                        style={{
                          flex: 1,
                          padding: "12px",
                          background: "#16a34a",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                        }}
                      >
                        Accept
                      </button>

                      <button
                        onClick={() => updateStatus(booking.id, "Rejected")}
                        style={{
                          flex: 1,
                          padding: "12px",
                          background: "red",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {booking.status === "Accepted" && (
                    <button
                      onClick={() => {
                        if (!booking.conversation_id) {
                          alert("Conversation not created.");
                          return;
                        }

                        router.push(`/chat/${booking.conversation_id}`);
                      }}
                      style={{
                        width: "100%",
                        marginTop: "15px",
                        padding: "12px",
                        background: "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      💬 Open Chat
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}