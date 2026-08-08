"use client";

import Link from "next/link";
import BookingStatus from "./BookingStatus";
import { supabase } from "@/app/lib/supabase";

type Booking = {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  items: {
    id: string;
    title: string;
    image_url: string;
    location: string;
    price: number;
  };
};

export default function BookingCard({
  booking,
}: {
  booking: Booking;
}) {
  async function cancelBooking() {
  const ok = confirm("Are you sure you want to cancel this booking?");

  if (!ok) return;

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "Cancelled",
    })
    .eq("id", booking.id)
.select();
console.log(data);
console.log(error);
console.log("Booking ID:", booking.id);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Booking Cancelled");

  window.location.reload();
}

  return (
    <div
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

        <p>📍 {booking.items.location}</p>

        <p
          style={{
            color: "#16a34a",
            fontWeight: "bold",
            fontSize: "18px",
          }}
        >
          ₹{booking.items.price} / day
        </p>

        <p>
          📅 {booking.start_date} → {booking.end_date}
        </p>

        <BookingStatus status={booking.status} />

        <br />
        <br />

{booking.status !== "Cancelled" &&
 booking.status !== "Completed" &&
 booking.status !== "Rejected" && (
  <button
    onClick={cancelBooking}
    style={{
      width: "100%",
      padding: "12px",
      background: "#ef4444",
      color: "white",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      marginBottom: "10px",
    }}
  >
    ❌ Cancel Booking
  </button>
)}
        <Link href={`/item/${booking.items.id}`}>
          <button
            style={{
              width: "100%",
              padding: "12px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            View Item
          </button>
        </Link>
      </div>
    </div>
  );
}