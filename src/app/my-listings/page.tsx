"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";

export default function MyListings() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetchMyItems();
  }, []);

  async function fetchMyItems() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please login first");
      return;
    }

    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setItems(data || []);
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

    fetchMyItems();
  }

  return (
    <div
      style={{
        padding: "30px",
        maxWidth: "1100px",
        margin: "auto",
        fontFamily: "Arial",
      }}
    >
      <h1>👤 My Listings</h1>

      {items.length === 0 ? (
        <p>You haven't uploaded any items yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
            gap: "20px",
            marginTop: "30px",
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                background: "white",
                borderRadius: "15px",
                overflow: "hidden",
                boxShadow: "0 2px 10px rgba(0,0,0,.1)",
              }}
            >
              <img
                src={item.image_url}
                alt={item.title}
                style={{
                  width: "100%",
                  height: "200px",
                  objectFit: "cover",
                }}
              />

              <div style={{ padding: "15px" }}>
                <h3>{item.title}</h3>

                <p>💰 ₹{item.price} / day</p>

                <p>📍 {item.location}</p>

                <Link href={`/edit/${item.id}`}>
                  <button
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      marginBottom: "10px",
                    }}
                  >
                    Edit
                  </button>
                </Link>

                <button
                  onClick={() => deleteItem(item.id)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "red",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}