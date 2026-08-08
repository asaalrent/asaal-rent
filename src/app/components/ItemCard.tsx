"use client";

import Link from "next/link";

type Item = {
  id: string;
  title: string;
  price: number;
  location: string;
  category: string;
  image_url: string;
  distance?: number;
};

export default function ItemCard({
  item,
  distance,
}: {
  item: Item;
  distance?: number;
}) {
  return (
    <Link
      href={`/item/${item.id}`}
      style={{
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "15px",
          overflow: "hidden",
          boxShadow: "0 2px 10px rgba(0,0,0,.1)",
          cursor: "pointer",
          transition: "0.2s",
        }}
      >
        <img
          src={item.image_url}
          alt={item.title}
          style={{
            width: "100%",
            height: "220px",
            objectFit: "cover",
          }}
        />

        <div style={{ padding: "15px" }}>
          <h3>{item.title}</h3>

          <p>📂 {item.category}</p>

          <p
            style={{
              color: "#16a34a",
              fontWeight: "bold",
              fontSize: "18px",
            }}
          >
            ₹{item.price} / day
          </p>

          <p>📍 {item.location}</p>
          {item.distance !== undefined && (
  <p
    style={{
      color: "#2563eb",
      fontWeight: "bold",
    }}
  >
    📏 {item.distance.toFixed(1)} km away
  </p>
)}
        </div>
      </div>
    </Link>
  );
}