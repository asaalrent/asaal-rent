"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import Navbar from "@/app/components/Navbar";
import ItemCard from "@/app/components/ItemCard";
export default function Dashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");

useEffect(() => {
  fetchItems();
}, []);

async function fetchItems() {
  const { data, error } = await supabase
    .from("items")
    .select("*");

  console.log("ERROR:", error);
  console.table(data);

  if (error) {
    console.error(error);
    return;
  }

  setItems(data || []);
}
  return (
    <div
      style={{
        padding: "30px",
        background: "#f5f5f5",
        minHeight: "100vh",
        fontFamily: "Arial",
      }}
    >
      <Navbar />
      <h1>🏠 Asaal Rent</h1>

      <p>Welcome back 👋</p>

     <input
  type="text"
  placeholder="Search anything to rent..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  style={{
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    marginTop: "20px",
    marginBottom: "30px",
  }}
/>

      <h2>Categories</h2>
      <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "20px",
    marginTop: "20px",
  }}
>
  {[
    "🚗 Vehicles",
    "🏠 Property",
    "📱 Electronics",
    "🛠 Tools",
    "👗 Fashion",
    "🐶 Pets",
    "📚 Books",
    "📦 Others",
  ].map((item) => (
    <div
      key={item}
      style={{
        background: "white",
        padding: "25px",
        borderRadius: "15px",
        textAlign: "center",
        cursor: "pointer",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      }}
    >
      <h3>{item}</h3>
    </div>
  ))}
</div>
    <div style={{ marginTop: "40px", textAlign: "center" }}>
      <h2 style={{ marginTop: "40px" }}>Latest Items</h2>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    marginTop: "20px",
  }}
>
 {items
  .filter((item) => {
    const q = search.toLowerCase();

    return (
      item.title?.toLowerCase().includes(q) ||
      item.location?.toLowerCase().includes(q)
    );
  })
  .map((item) => (
    <ItemCard key={item.id} item={item} />
  ))}
</div>
  <Link href="/upload">
    <button
      style={{
        padding: "15px 30px",
        background: "#16a34a",
        color: "white",
        border: "none",
        borderRadius: "10px",
        fontSize: "18px",
        cursor: "pointer",
      }}
    >
      + Upload Item
    </button>
  </Link>
  <div
  style={{
    marginTop: "15px",
  }}
>
  <Link href="/chat">
    <button
      style={{
        padding: "15px 30px",
        background: "#2563eb",
        color: "white",
        border: "none",
        borderRadius: "10px",
        fontSize: "18px",
        cursor: "pointer",
      }}
    >
      💬 Chats
    </button>
  </Link>
</div>
</div></div>
  );
}