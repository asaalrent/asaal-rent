"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

export default function EditItemPage() {
  const { id } = useParams();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    fetchItem();
  }, []);

  async function fetchItem() {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setTitle(data.title || "");
    setPrice(String(data.price || ""));
    setDescription(data.description || "");
    setLocation(data.location || "");
    setImageUrl(data.image_url || "");
  }

 async function updateItem() {
  console.log("ID:", id);

  const { data, error } = await supabase
    .from("items")
    .update({
      title,
      price: Number(price),
      description,
      location,
      image_url: imageUrl,
    })
    .eq("id", id)
    .select();

  console.log("Updated Data:", data);
  console.log("Error:", error);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Item Updated Successfully!");
  router.push("/my-listings");
}

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "40px auto",
        padding: 20,
        fontFamily: "Arial",
      }}
    >
      <h1>Edit Listing</h1>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        style={{ width: "100%", padding: 12, marginBottom: 15 }}
      />

      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Price"
        style={{ width: "100%", padding: 12, marginBottom: 15 }}
      />

      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location"
        style={{ width: "100%", padding: 12, marginBottom: 15 }}
      />

      <input
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="Image URL"
        style={{ width: "100%", padding: 12, marginBottom: 15 }}
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={5}
        style={{ width: "100%", padding: 12, marginBottom: 20 }}
      />

      <button
        onClick={updateItem}
        style={{
          width: "100%",
          padding: 15,
          background: "green",
          color: "white",
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
          fontSize: 16,
        }}
      >
        Save Changes
      </button>
    </div>
  );
}