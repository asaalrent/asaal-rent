"use client";

import { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/app/lib/supabase";
import Link from "next/link";

export default function WishlistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWishlist();
  }, []);

  async function loadWishlist() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("wishlist")
      .select(`
        id,
        item:items!wishlist_item_id_fkey (
          id,
          title,
          price,
          location,
          image_url
        )
      `)
      .eq("user_id", user.id);
      

    setItems(data || []);
    setLoading(false);
  }

  async function removeWishlist(id: string) {
    await supabase
      .from("wishlist")
      .delete()
      .eq("id", id);

    loadWishlist();
  }

  return (
    <>
      <Navbar />

      <div
        style={{
          maxWidth: "1200px",
          margin: "40px auto",
          padding: "20px",
        }}
      >
        <h1>❤️ Wishlist</h1>

        {loading ? (
          <h3>Loading...</h3>
        ) : items.length === 0 ? (
          <h3>No items in wishlist.</h3>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: "20px",
              marginTop: "30px",
            }}
          >
            {items.map((wish: any) => (
              <div
                key={wish.id}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 2px 10px rgba(0,0,0,.1)",
                }}
              >
                <img
                  src={wish.item.image_url}
                  alt={wish.item.title}
                  style={{
                    width: "100%",
                    height: "220px",
                    objectFit: "cover",
                  }}
                />

                <div style={{ padding: "15px" }}>
                  <h3>{wish.item.title}</h3>

                  <p>₹ {wish.item.price}</p>

                  <p>{wish.item.location}</p>

                  <Link href={`/item/${wish.item.id}`}>
                    <button
                      style={{
                        width: "100%",
                        padding: "10px",
                        background: "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        marginTop: "10px",
                      }}
                    >
                      View Item
                    </button>
                  </Link>

                  <button
                    onClick={() => removeWishlist(wish.id)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "red",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      marginTop: "10px",
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}