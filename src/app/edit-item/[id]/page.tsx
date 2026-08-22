"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

export default function EditItemPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState<File | null>(null);
const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    loadItem();
  }, []);

  async function loadItem() {
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
    setDescription(data.description || "");
    setPrice(String(data.price || ""));
    setLocation(data.location || "");
    setImageUrl(data.image_url || "");

    setLoading(false);
  }

  async function updateItem() {
    let finalImage = imageUrl;

if (image) {
  const fileName = `${Date.now()}-${image.name}`;

  const { error: uploadError } = await supabase.storage
    .from("items")
    .upload(fileName, image);

  if (uploadError) {
    alert(uploadError.message);
    return;
  }

  const { data } = supabase.storage
    .from("items")
    .getPublicUrl(fileName);

  finalImage = data.publicUrl;
}
    const { error } = await supabase
      .from("items")
      .update({
        title,
        description,
        price: Number(price),
        location,
        image_url: finalImage,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("✅ Item Updated Successfully");

    router.push("/profile");
  }

  if (loading) {
    return <h2 style={{ padding: 30 }}>Loading...</h2>;
  }

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "40px auto",
      }}
    >
      <h1>Edit Item</h1>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        style={input}
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={6}
        placeholder="Description"
        style={input}
      />

      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Price"
        style={input}
      />

      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location"
        style={input}
      />
      <img
  src={
    image
      ? URL.createObjectURL(image)
      : imageUrl || "https://placehold.co/500x300?text=Item"
  }
  alt="Preview"
  style={{
    width: "100%",
    height: "300px",
    objectFit: "cover",
    borderRadius: "12px",
    marginTop: "20px",
    marginBottom: "15px",
  }}
/>

<input
  type="file"
  accept="image/*"
  onChange={(e) => {
    if (e.target.files?.[0]) {
      setImage(e.target.files[0]);
    }
  }}
  style={{
    width: "100%",
    marginBottom: "20px",
  }}
/>

      <button
        onClick={updateItem}
        style={{
          width: "100%",
          padding: "15px",
          background: "#16a34a",
          color: "white",
          border: "none",
          borderRadius: "10px",
          cursor: "pointer",
          fontSize: "17px",
          fontWeight: "bold",
        }}
      >
        Save Changes
      </button>
    </div>
  );
}

const input = {
  width: "100%",
  padding: "12px",
  marginTop: "15px",
  borderRadius: "10px",
  border: "1px solid #ddd",
} as const;