"use client";

import { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";
import BookingCard from "@/app/components/BookingCard";
import { supabase } from "@/app/lib/supabase";

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please login first");
      return;
    }

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
          *,
          items (
            id,
            title,
            image_url,
            location,
            price
          )
        `
      )
      .eq("renter_id", user.id)
      .neq("status", "Cancelled")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
    console.log(data);

    setBookings(data || []);
    setLoading(false);
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
        <h1>📅 My Bookings</h1>

        {loading ? (
          <h3>Loading...</h3>
        ) : bookings.length === 0 ? (
          <h3>No bookings found.</h3>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: "20px",
              marginTop: "30px",
            }}
          >
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}