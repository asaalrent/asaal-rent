"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState<File | null>(null);

  async function uploadItem() {
    try {
      if (!image) {
        alert("Please select an image.");
        return;
      }

      // Check login
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please login first.");
        return;
      }

      // Upload image
      const fileName = `${Date.now()}-${image.name}`;

      const { error: uploadError } = await supabase.storage
        .from("items")
        .upload(fileName, image);

      if (uploadError) {
        alert(uploadError.message);
        return;
      }

      // Get public image URL
      const { data } = supabase.storage
        .from("items")
        .getPublicUrl(fileName);

      const imageUrl = data.publicUrl;
      console.log("CATEGORY =", category);
      console.log("Selected Category:", category);
console.log({
  title,
  description,
  price,
  location,
  category,
});
      // Save item
const { data: insertedData, error: dbError } = await supabase
  .from("items")
  .insert([
    {
      title,
      description,
      price: Number(price),
      location,
      category,
      image_url: imageUrl,
      user_id: user.id,
    },
  ])
  .select();

console.log("Inserted Data:", insertedData);
console.log("Insert Error:", dbError);
const { data: allItems, error: selectError } = await supabase
  .from("items")
  .select("*")
  .order("created_at", { ascending: false });

console.log("ALL ITEMS:", allItems);
console.log("SELECT ERROR:", selectError);

if (dbError) {
  alert(dbError.message);
  return;
}

      alert("Item Uploaded Successfully!");

      setTitle("");
      setDescription("");
      setPrice("");
      setLocation("");
      setCategory("");
      setImage(null);
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  }

  return (
    <div
      style={{
        padding: "30px",
        fontFamily: "Arial",
        maxWidth: "700px",
        margin: "auto",
      }}
    >
      <h1>📦 Upload Item</h1>

      <br />

      <input
        type="text"
        placeholder="Item Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "15px",
        }}
      />

      <textarea
        placeholder="Item Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{
          width: "100%",
          height: "120px",
          padding: "12px",
          marginBottom: "15px",
        }}
      />

      <input
        type="number"
        placeholder="Rent Per Day (₹)"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "15px",
        }}
      />

      <input
        type="text"
        placeholder="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "15px",
        }}
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "15px",
        }}
      >
        <option value="">Select Category</option>
        <option value="Vehicles">🚗 Vehicles</option>
        <option value="Property">🏠 Property</option>
        <option value="Electronics">📱 Electronics</option>
        <option value="Tools">🛠 Tools</option>
        <option value="Fashion">👗 Fashion</option>
        <option value="Pets">🐶 Pets</option>
        <option value="Books">📚 Books</option>
        <option value="Others">📦 Others</option>
      </select>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            setImage(e.target.files[0]);
          }
        }}
        style={{
          width: "100%",
          marginBottom: "20px",
        }}
      />

      <button
        onClick={uploadItem}
        style={{
          padding: "12px 25px",
          fontSize: "16px",
          cursor: "pointer",
          background: "#16a34a",
          color: "white",
          border: "none",
          borderRadius: "10px",
        }}
      >
        Upload Item
      </button>
    </div>
  );
}