"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "40px",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "700px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,.1)",
        }}
      >
        <h1
          style={{
            fontSize: "42px",
            marginBottom: "10px",
          }}
        >
          🚀 Asaal Rent
        </h1>

        <p
          style={{
            fontSize: "18px",
            color: "#666",
            marginBottom: "35px",
          }}
        >
          Rent Anything. Anywhere.
        </p>

        <div
          style={{
            display: "grid",
            gap: "15px",
          }}
        >
          <Link href="/dashboard">
            <button style={button}>
              🏠 Dashboard
            </button>
          </Link>

          <Link href="/upload">
            <button style={button}>
              📦 Upload Item
            </button>
          </Link>

          <Link href="/my-listings">
            <button style={button}>
              📋 My Listings
            </button>
          </Link>

          <Link href="/my-bookings">
            <button style={button}>
              📅 My Bookings
            </button>
          </Link>

          <Link href="/booking-requests">
            <button style={button}>
              🤝 Booking Requests
            </button>
          </Link>

          <Link href="/notifications">
            <button style={button}>
              🔔 Notifications
            </button>
          </Link>

          <Link href="/chat">
            <button style={button}>
              💬 Chat
            </button>
          </Link>

          <Link href="/settings">
            <button style={button}>
              ⚙ Settings
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

const button: React.CSSProperties = {
  width: "100%",
  padding: "16px",
  fontSize: "18px",
  border: "none",
  borderRadius: "12px",
  background: "#16a34a",
  color: "white",
  cursor: "pointer",
};