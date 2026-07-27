"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setCity(data.city || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatar_url || "");
    }
  }
async function uploadImage() {
  if (!image) return avatarUrl;

 const {
  data: { user },
} = await supabase.auth.getUser();

const fileName = `${user!.id}/${Date.now()}-${image.name}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(fileName, image);

  if (error) {
    alert(error.message);
    return avatarUrl;
  }

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  return data.publicUrl;
}
  async function saveProfile() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const imageUrl = await uploadImage();

    if (!user) {
      alert("Please login first");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      phone,
      city,
      bio,
      avatar_url: imageUrl,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("✅ Profile Saved Successfully!");
  }

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "40px auto",
        padding: "20px",
        fontFamily: "Arial",
      }}
    >
      <h1>👤 My Profile</h1>

      {avatarUrl && (
        <img
          src={avatarUrl}
          alt="Profile"
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            objectFit: "cover",
            marginBottom: "20px",
            border: "3px solid #16a34a",
          }}
        />
      )}

      <input
        placeholder="Full Name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          marginBottom: 15,
        }}
      />

      <input
        placeholder="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          marginBottom: 15,
        }}
      />

      <input
        placeholder="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          marginBottom: 15,
        }}
      />

      <textarea
        placeholder="Bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={4}
        style={{
          width: "100%",
          padding: 12,
          marginBottom: 15,
          resize: "none",
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
        onClick={saveProfile}
        disabled={loading}
        style={{
          width: "100%",
          padding: "15px",
          background: "#16a34a",
          color: "white",
          border: "none",
          borderRadius: "10px",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        {loading ? "Saving..." : "💾 Save Profile"}
      </button>
    </div>
  );
}