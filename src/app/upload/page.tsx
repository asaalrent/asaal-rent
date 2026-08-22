"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { supabase } from "../lib/supabase";
const Map = dynamic(() => import("../components/Map"), {
  ssr: false,
});

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
const [longitude, setLongitude] = useState<number | null>(null);
  const [category, setCategory] = useState("");
  function getCurrentLocation() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      setLatitude(lat);
      setLongitude(lng);

      alert("Location Selected Successfully");
    },
    () => {
      alert("Location Permission Denied");
    }
  );
}
  const [images, setImages] = useState<File[]>([]);

  async function uploadItem() {
    try {
      if (images.length === 0) {
  alert("Please select at least one image.");
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
      const imageUrls: string[] = [];

for (const image of images) {
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

  imageUrls.push(data.publicUrl);
}

const imageUrl = imageUrls[0];
      
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
      keywords: `${title} ${description} ${category} ${location}`,
      image_url: imageUrl,
      images: imageUrls,
      user_id: user.id,
      status: "Pending",
      latitude,
      longitude,
    },
  ])
  .select();


const { data: allItems, error: selectError } = await supabase
  .from("items")
  .select("*")
  .order("created_at", { ascending: false });



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
      setImages([]);
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
      <h3 style={{ marginTop: "20px" }}>📍 Select Location on Map</h3>
      <button
  onClick={getCurrentLocation}
  style={{
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    marginBottom: "15px",
  }}
>
  📍 Use My Current Location
</button>
      <h2 style={{ color: "red" }}>MAP TEST</h2>


<Map
  onLocationChange={(lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
  }}
/>
<p>
  Latitude: {latitude}
</p>

<p>
  Longitude: {longitude}
</p>

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
  multiple
  onChange={(e) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
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