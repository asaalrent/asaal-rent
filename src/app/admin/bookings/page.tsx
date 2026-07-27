"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

export default function AdminBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      setLoading(false);
      return;
    }

    setBookings(data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          fontSize: 22,
        }}
      >
        Loading...
      </div>
    );
  }
  async function updateBooking(id: string, status: string) {
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  loadBookings();
}

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "40px auto",
        padding: "20px",
      }}
    >
      <h1>📅 Admin Bookings</h1>

      <br />

      {bookings.length === 0 ? (
        <h3>No Bookings Found</h3>
      ) : (
        bookings.map((booking) => (
          <div
            key={booking.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <h3>Booking ID : {booking.id}</h3>

            <p>Item ID : {booking.item_id}</p>

            <p>Owner ID : {booking.owner_id}</p>

            <p>Renter ID : {booking.renter_id}</p>

            <p>Start : {booking.start_date}</p>

            <p>End : {booking.end_date}</p>

            <p>Total : ₹{booking.total_price}</p>

            <p>Status : {booking.status}</p>
            <div
  style={{
    display: "flex",
    gap: "10px",
    marginTop: "15px",
  }}
>
  <button
    onClick={() => updateBooking(booking.id, "Accepted")}
    style={{
      background: "green",
      color: "white",
      border: "none",
      padding: "10px 15px",
      borderRadius: "8px",
      cursor: "pointer",
    }}
  >
    ✅ Accept
  </button>

  <button
    onClick={() => updateBooking(booking.id, "Rejected")}
    style={{
      background: "red",
      color: "white",
      border: "none",
      padding: "10px 15px",
      borderRadius: "8px",
      cursor: "pointer",
    }}
  >
    ❌ Reject
  </button>
</div>
          </div>
        ))
      )}
    </div>
  );
}