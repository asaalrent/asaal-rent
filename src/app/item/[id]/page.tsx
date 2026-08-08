"use client";

import { useEffect, useState } from "react";
function getDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import DatePicker from "react-datepicker";
import dynamic from "next/dynamic";
import "react-datepicker/dist/react-datepicker.css";

interface ItemMapProps {
  latitude: number;
  longitude: number;
}

const ItemMap = dynamic<ItemMapProps>(
  () => import("@/app/components/ItemMap"),
  {
    ssr: false,
  }
);

export default function ItemPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalPrice, setTotalPrice] = useState(0);

  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [reviews, setReviews] = useState<any[]>([]);
  const [bookedDates, setBookedDates] = useState<string[]>([]);

  useEffect(() => {
    loadItem();
  }, [id]);

  useEffect(() => {
    if (!startDate || !endDate || !item) {
      setTotalPrice(0);
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const days =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (days > 0) {
      setTotalPrice(days * item.price);
    } else {
      setTotalPrice(0);
    }
  }, [startDate, endDate, item]);

  async function loadItem() {
    setLoading(true);

    const { data: itemData, error } = await supabase
      .from("items")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !itemData) {
      setLoading(false);
      return;
    }

    setItem(itemData);

    const {
  data: { user },
} = await supabase.auth.getUser();

if (user) {
  const { data: existing } = await supabase
    .from("recently_viewed")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_id", itemData.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("recently_viewed")
      .update({
        viewed_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    const { data: insertData, error: insertError } = await supabase
  .from("recently_viewed")
  .insert({
    user_id: user.id,
    item_id: itemData.id,
  })
  .select();

console.log("INSERT DATA =", insertData);
console.log("INSERT ERROR =", insertError);
console.log("USER ID =", user.id);
console.log("ITEM ID =", itemData.id);
  }
}

    const { data: ownerData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", itemData.user_id)
      .single();

    setOwner(ownerData);

   

    if (user) {
      const { data } = await supabase
        .from("wishlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("item_id", itemData.id)
        .maybeSingle();

      setWishlisted(!!data);
    }

    const { data: reviewData } = await supabase
      .from("reviews")
      .select(`
        *,
        profiles:renter_id (
          full_name,
          avatar_url
        )
      `)
      .eq("item_id", itemData.id)
      .order("created_at", { ascending: false });

    setReviews(reviewData || []);
    const { data: booked } = await supabase
  .from("bookings")
  .select("start_date, end_date")
  .eq("item_id", itemData.id)
  .eq("status", "Accepted");

const dates: string[] = [];

booked?.forEach((booking) => {
  let current = new Date(booking.start_date);
  const end = new Date(booking.end_date);

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
});

console.log("Booked Dates =", dates);

setBookedDates(dates);
    setLoading(false);
  }

  async function bookNow() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please login first");
      return;
    }

    if (user.id === item.user_id) {
      alert("You cannot book your own item.");
      return;
    }

    if (!startDate || !endDate) {
      alert("Please select booking dates.");
      return;
    }

    if (totalPrice <= 0) {
      alert("Invalid booking dates.");
      return;
    }

    setBookingLoading(true);

    try {
      let conversationId;

const { data: existingConversation } = await supabase
  .from("conversations")
  .select("id")
  .eq("item_id", item.id)
  .eq("owner_id", item.user_id)
  .eq("buyer_id", user.id)
  .maybeSingle();

if (existingConversation) {
  conversationId = existingConversation.id;
} else {
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .insert({
      item_id: item.id,
      owner_id: item.user_id,
      buyer_id: user.id,
    })
    .select()
    .single();

  if (conversationError) throw conversationError;

  conversationId = conversation.id;
}

      const { error } = await supabase.from("bookings").insert({
        item_id: item.id,
        owner_id: item.user_id,
        renter_id: user.id,
        conversation_id: conversationId,
        start_date: startDate,
        end_date: endDate,
        total_price: totalPrice,
        status: "Pending",
      });

      if (error) throw error;

      alert("✅ Booking Request Sent");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBookingLoading(false);
    }
  }

  async function chatWithOwner() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please login first");
      return;
    }

    if (user.id === item.user_id) {
      alert("You cannot chat with yourself.");
      return;
    }

    let { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("item_id", item.id)
      .eq("owner_id", item.user_id)
      .eq("buyer_id", user.id)
      .maybeSingle();

    if (!conversation) {
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          item_id: item.id,
          owner_id: item.user_id,
          buyer_id: user.id,
        })
        .select()
        .single();

      if (error) {
        alert(error.message);
        return;
      }

      conversation = data;
    }

    router.push(`/chat/${conversation.id}`);
  }

  async function toggleWishlist() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please login first");
      return;
    }

    if (!wishlisted) {
      const { data, error } = await supabase
        .from("wishlist")
        .insert({
          user_id: user.id,
          item_id: item.id,
        })
        .select();

      if (error) {
        alert(error.message);
        return;
      }

      console.log("USER ID =", user.id);
      console.log("ITEM ID =", item.id);
      console.log("DATA =", data);
      setWishlisted(true);
    } else {
      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("user_id", user.id)
        .eq("item_id", item.id);

      if (error) {
        alert(error.message);
        return;
      }

      setWishlisted(false);
    }
  }

  async function submitReview() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please login first");
      return;
    }

    const { error } = await supabase.from("reviews").insert({
      item_id: item.id,
      booking_id: null,
      owner_id: item.user_id,
      renter_id: user.id,
      rating,
      review,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("⭐ Review submitted successfully!");
    setRating(5);
    setReview("");

    const { data: reviewData } = await supabase
      .from("reviews")
      .select(`
        *,
        profiles:renter_id (
          full_name,
          avatar_url
        )
      `)
      .eq("item_id", item.id)
      .order("created_at", { ascending: false });

    setReviews(reviewData || []);
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
        Loading Item...
      </div>
    );
  }

  if (!item) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
        }}
      >
        <h2>Item Not Found</h2>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "40px auto",
        padding: "20px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "40px",
          alignItems: "start",
        }}
      >
        <div>
          <img
            src={item.image_url}
            alt={item.title}
            style={{
              width: "100%",
              borderRadius: "20px",
              objectFit: "cover",
              maxHeight: "550px",
            }}
          />
        </div>

        <div>
          <h1
            style={{
              fontSize: "34px",
              marginBottom: "15px",
            }}
          >
            {item.title}
          </h1>

          <h2
            style={{
              color: "#16a34a",
              marginBottom: "20px",
            }}
          >
            ₹{item.price} / day
          </h2>

          <p
            style={{
              fontSize: "17px",
              lineHeight: 1.7,
            }}
          >
            {item.description}
          </p>

          <div
            style={{
              marginTop: "20px",
              fontSize: "18px",
            }}
          >
            📍 {item.location}
          </div>

          <div
            style={{
              marginTop: "35px",
              padding: "20px",
              border: "1px solid #e5e5e5",
              borderRadius: "15px",
            }}
          >
            <h3
              style={{
                marginBottom: "15px",
              }}
            >
              Owner
            </h3>

            <div
              style={{
                display: "flex",
                gap: "15px",
                alignItems: "center",
              }}
            >
              <img
                src={owner?.avatar_url || "https://placehold.co/80x80?text=User"}
                alt=""
                style={{
                  width: "70px",
                  height: "70px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />

              <div style={{ flex: 1 }}>
                <h3>{owner?.full_name || "Unknown User"}</h3>
                <p>📍 {owner?.city || "No City"}</p>
              </div>

              <Link
                href={`/user/${owner?.id}`}
                style={{
                  background: "#16a34a",
                  color: "#fff",
                  padding: "10px 18px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontWeight: "bold",
                }}
              >
                View Profile
              </Link>
            </div>

            <div
              style={{
                marginTop: "25px",
                display: "grid",
                gap: "15px",
              }}
            >
              <input
                type="date"
                value={startDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
  if (bookedDates.includes(e.target.value)) {
    alert("This date is already booked.");
    return;
  }

  setStartDate(e.target.value);
}}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                }}
              />

              <input
                type="date"
                value={endDate}
                min={startDate || new Date().toISOString().split("T")[0]}
                onChange={(e) => {
  if (bookedDates.includes(e.target.value)) {
    alert("This date is already booked.");
    return;
  }

  if (startDate && e.target.value < startDate) {
    alert("End date cannot be before start date.");
    return;
  }

  setEndDate(e.target.value);
}}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                }}
              />

              <div
                style={{
                  fontWeight: "bold",
                  color: "#16a34a",
                  fontSize: "20px",
                }}
              >
                Total Rent: ₹{totalPrice}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "15px",
              marginTop: "30px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={bookNow}
              disabled={bookingLoading}
              style={{
                flex: 1,
                padding: "16px",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                cursor: bookingLoading ? "not-allowed" : "pointer",
                fontSize: "17px",
                fontWeight: "bold",
                opacity: bookingLoading ? 0.7 : 1,
              }}
            >
              {bookingLoading ? "Sending..." : "📅 Book Now"}
            </button>

            <button
              onClick={chatWithOwner}
              style={{
                flex: 1,
                padding: "16px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "17px",
                fontWeight: "bold",
              }}
            >
              💬 Chat with Owner
            </button>

            <button
              onClick={toggleWishlist}
              style={{
                width: "70px",
                background: wishlisted ? "#ef4444" : "#fff",
                border: "2px solid #ef4444",
                color: wishlisted ? "#fff" : "#ef4444",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "26px",
                transition: "0.2s",
              }}
            >
              ❤
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "50px",
        }}
      >
        <h2
          style={{
            marginBottom: "20px",
          }}
        >
          About this Item
        </h2>

        <div
          style={{
            background: "#fff",
            borderRadius: "15px",
            padding: "25px",
            boxShadow: "0 2px 10px rgba(0,0,0,.08)",
            lineHeight: 1.8,
            fontSize: "17px",
          }}
        >
          {item.description || "No description available."}
        </div>
      </div>

      <div
        style={{
          marginTop: "40px",
          background: "#fff",
          padding: "25px",
          borderRadius: "15px",
          boxShadow: "0 2px 10px rgba(0,0,0,.08)",
        }}
      >
        <h2>⭐ Leave a Review</h2>

        <div
          style={{
            marginTop: "20px",
            display: "grid",
            gap: "15px",
          }}
        >
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            style={{
              padding: "12px",
              borderRadius: "10px",
            }}
          >
            <option value={5}>⭐⭐⭐⭐⭐ 5</option>
            <option value={4}>⭐⭐⭐⭐ 4</option>
            <option value={3}>⭐⭐⭐ 3</option>
            <option value={2}>⭐⭐ 2</option>
            <option value={1}>⭐ 1</option>
          </select>

          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Write your review..."
            rows={5}
            style={{
              padding: "12px",
              borderRadius: "10px",
              resize: "vertical",
            }}
          />

          <button
            onClick={submitReview}
            style={{
              padding: "14px",
              background: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Submit Review
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: "40px",
        }}
      >
        <h2
          style={{
            marginBottom: "20px",
          }}
        >
          ⭐ Customer Reviews ({reviews.length})
        </h2>

        {reviews.length === 0 ? (
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "15px",
            }}
          >
            No reviews yet.
          </div>
        ) : (
          reviews.map((r: any) => (
            <div
              key={r.id}
              style={{
                background: "#fff",
                padding: "20px",
                borderRadius: "15px",
                marginBottom: "15px",
                boxShadow: "0 2px 10px rgba(0,0,0,.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                }}
              >
                <img
                  src={
                    r.profiles?.avatar_url ||
                    "https://placehold.co/60x60?text=User"
                  }
                  alt=""
                  style={{
                    width: "55px",
                    height: "55px",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />

                <div>
                  <h4 style={{ margin: 0 }}>
                    {r.profiles?.full_name || "Anonymous"}
                  </h4>

                  <div
                    style={{
                      color: "#f59e0b",
                      fontSize: "18px",
                    }}
                  >
                    {"⭐".repeat(r.rating)}
                  </div>
                </div>
              </div>

              <p
                style={{
                  marginTop: "15px",
                  lineHeight: 1.7,
                }}
              >
                {r.review}
              </p>
            </div>
          ))
        )}
      </div>
      {item.latitude && item.longitude && (
  <div
    style={{
      marginTop: "40px",
    }}
  >
    <h2
      style={{
        marginBottom: "20px",
      }}
    >
      📍 Item Location
    </h2>

    <ItemMap
      latitude={item.latitude}
      longitude={item.longitude}
    />
  </div>
)}

      <div
        style={{
          marginTop: "40px",
        }}
      >
        <h2
          style={{
            marginBottom: "20px",
          }}
        >
          Rental Information
        </h2>

        <div
          style={{
            background: "#fff",
            borderRadius: "15px",
            padding: "25px",
            boxShadow: "0 2px 10px rgba(0,0,0,.08)",
          }}
        >
          <p>
            <strong>Price:</strong> ₹{item.price} / day
          </p>
          <p>
            <strong>Location:</strong> {item.location}
          </p>
          <p>
            <strong>Status:</strong> Available
          </p>
        </div>
      </div>
    </div>
  );
}