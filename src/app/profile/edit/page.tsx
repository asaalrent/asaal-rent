"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/app/lib/supabase";

export default function EditProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setFullName(data.full_name || "");
      setCity(data.city || "");
      setPhone(data.phone || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatar_url || "");
    }

    setLoading(false);
  }

  async function saveProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        city,
        phone,
        bio,
      })
      .eq("id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("✅ Profile Updated");

    router.push("/profile");
  }

  if (loading) return <h2 style={{ padding: 30 }}>Loading...</h2>;

  return (
    <>
      <Navbar />

      <div
        style={{
          maxWidth: "700px",
          margin: "40px auto",
          background: "#fff",
          padding: "30px",
          borderRadius: "15px",
        }}
      >
        <h1>Edit Profile</h1>

        <img
          src={
            avatarUrl ||
            "https://placehold.co/120x120?text=User"
          }
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            objectFit: "cover",
            marginTop: 20,
            marginBottom: 20,
          }}
        />

        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full Name"
          style={inputStyle}
        />

        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          style={inputStyle}
        />

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          style={inputStyle}
        />

        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="About Me"
          rows={5}
          style={inputStyle}
        />

        <button
          onClick={saveProfile}
          style={{
            width: "100%",
            padding: "15px",
            background: "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "18px",
            marginTop: "20px",
          }}
        >
          Save Profile
        </button>
      </div>
    </>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginTop: "15px",
  borderRadius: "10px",
  border: "1px solid #ddd",
} as const;