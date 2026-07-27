"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

export default function AdminItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
   const { data, error } = await supabase
  .from("items")
  .select("*")
  .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setItems(data || []);
    setLoading(false);
  }

  if (loading) {
    return <h2 style={{ padding: 30 }}>Loading...</h2>;
  }
  async function updateStatus(id: number, status: string) {
  const { error } = await supabase
    .from("items")
    .update({ status })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  loadItems();
}

async function deleteItem(id: number) {
  const ok = confirm("Delete this item?");

  if (!ok) return;

  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  loadItems();
}

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "40px auto",
        padding: "20px",
      }}
    >
      <h1>📦 Manage Listings</h1>

      <div
        style={{
          display: "grid",
          gap: "20px",
          marginTop: "30px",
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 2px 10px rgba(0,0,0,.1)",
            }}
          >
            <img
              src={item.image_url}
              style={{
                width: "100%",
                maxHeight: "250px",
                objectFit: "cover",
                borderRadius: "10px",
              }}
            />

            <h2>{item.title}</h2>

            <p>₹{item.price}/day</p>

            <p>📍 {item.location}</p>

            <p>👤 Owner ID: {item.user_id}</p>

            <p>Status : {item.status}</p>
            <div
  style={{
    display: "flex",
    gap: "10px",
    marginTop: "15px",
  }}
>
  <button
    onClick={() => updateStatus(item.id, "Approved")}
    style={{
      background: "green",
      color: "white",
      border: "none",
      padding: "10px 18px",
      borderRadius: "8px",
      cursor: "pointer",
    }}
  >
    ✅ Approve
  </button>

  <button
    onClick={() => updateStatus(item.id, "Rejected")}
    style={{
      background: "orange",
      color: "white",
      border: "none",
      padding: "10px 18px",
      borderRadius: "8px",
      cursor: "pointer",
    }}
  >
    ❌ Reject
  </button>

  <button
    onClick={() => deleteItem(item.id)}
    style={{
      background: "red",
      color: "white",
      border: "none",
      padding: "10px 18px",
      borderRadius: "8px",
      cursor: "pointer",
    }}
  >
    🗑 Delete
  </button>
</div>
          </div>
        ))}
      </div>
    </div>
  );
}