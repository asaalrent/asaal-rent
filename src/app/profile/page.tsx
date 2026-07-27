"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [verified, setVerified] = useState(false);

  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (!image) return;

    const objectUrl = URL.createObjectURL(image);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);
  async function loadProfile() {
    console.log("STEP 1 - loadProfile started");
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log("STEP 2 - User:", user);

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);
    setEmail(user.email ?? "");

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
      console.log("STEP 3 - Profile Data:", data);
console.log("STEP 4 - Profile Error:", error);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    if (data) {
      setFullName(data.full_name ?? "");
      setPhone(data.phone ?? "");
      setCity(data.city ?? "");
      setBio(data.bio ?? "");
      setAvatarUrl(data.avatar_url ?? "");
      setVerified(data.verified ?? false);
    }
  } catch (err) {
    console.error(err);
    alert("Failed to load profile.");
  } finally {
    setLoading(false);
  }
}
async function uploadAvatar() {
  if (!image) return avatarUrl;

  const fileExt = image.name.split(".").pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(fileName, image, {
      cacheControl: "3600",
      upsert: true,
    });

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
  try {
    setSaving(true);

    let photo = avatarUrl;

    if (image) {
      photo = await uploadAvatar();
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        full_name: fullName,
        email,
        phone,
        city,
        bio,
        avatar_url: photo,
      });

    if (error) {
      throw error;
    }

    setAvatarUrl(photo);

    alert("✅ Profile Updated Successfully");
  } catch (err: any) {
    alert(err.message || "Something went wrong");
  } finally {
    setSaving(false);
  }
}
if (loading) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "70vh",
        fontSize: "22px",
        fontWeight: "bold",
      }}
    >
      Loading Profile...
    </div>
  );
}

return (
  <div
    style={{
      maxWidth: "1000px",
      margin: "40px auto",
      padding: "20px",
      fontFamily: "Arial, sans-serif",
    }}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: "20px",
        padding: "30px",
        boxShadow: "0 5px 20px rgba(0,0,0,.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "30px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <img
          src={
            preview ||
            avatarUrl ||
            "https://placehold.co/180x180?text=Profile"
          }
          alt="Profile"
          style={{
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "4px solid #16a34a",
          }}
        />

        <div style={{ flex: 1 }}>
          <h1
            style={{
              marginBottom: "10px",
            }}
          >
            {fullName || "Your Name"}
          </h1>

          <p>{email}</p>

          <p>{phone || "No phone number"}</p>

          <p>{city || "No city selected"}</p>

          <p>{bio || "No bio available"}</p>

          {verified && (
            <div
              style={{
                color: "#16a34a",
                fontWeight: "bold",
                marginTop: "10px",
              }}
            >
              ✔ Verified User
            </div>
          )}
        </div>
      </div>

      <hr style={{ margin: "30px 0" }} />

      <h2>Edit Profile</h2>
      <div
  style={{
    display: "grid",
    gap: "18px",
    marginTop: "20px",
  }}
>
  <input
    type="text"
    placeholder="Full Name"
    value={fullName}
    onChange={(e) => setFullName(e.target.value)}
    style={{
      padding: "14px",
      borderRadius: "10px",
      border: "1px solid #ddd",
      fontSize: "16px",
    }}
  />

  <input
    type="text"
    placeholder="Phone Number"
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
    style={{
      padding: "14px",
      borderRadius: "10px",
      border: "1px solid #ddd",
      fontSize: "16px",
    }}
  />

  <input
    type="text"
    placeholder="City"
    value={city}
    onChange={(e) => setCity(e.target.value)}
    style={{
      padding: "14px",
      borderRadius: "10px",
      border: "1px solid #ddd",
      fontSize: "16px",
    }}
  />

  <textarea
    placeholder="Write something about yourself..."
    value={bio}
    onChange={(e) => setBio(e.target.value)}
    rows={5}
    style={{
      padding: "14px",
      borderRadius: "10px",
      border: "1px solid #ddd",
      resize: "none",
      fontSize: "16px",
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
  />

  <button
    onClick={saveProfile}
    disabled={saving}
    style={{
      background: "#16a34a",
      color: "#fff",
      border: "none",
      padding: "15px",
      borderRadius: "10px",
      cursor: saving ? "not-allowed" : "pointer",
      fontSize: "17px",
      fontWeight: "bold",
      opacity: saving ? 0.7 : 1,
    }}
  >
    {saving ? "Saving Profile..." : "💾 Save Profile"}
  </button>
</div>

</div>

<div
  style={{
    marginTop: "35px",
    background: "#fff",
    borderRadius: "20px",
    padding: "25px",
    boxShadow: "0 5px 20px rgba(0,0,0,.08)",
  }}
>
  <h2
    style={{
      marginBottom: "20px",
    }}
  >
    📦 My Listings
  </h2>

 <Listings userId={userId} />
    </div>
  </div>
);
}
function Listings({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, [userId]);

  async function loadItems() {
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setItems(data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px",
          fontSize: "18px",
        }}
      >
        Loading Listings...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "50px",
          color: "#666",
        }}
      >
        <h3>No Listings Yet</h3>
        <p>Upload your first item to see it here.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
        gap: "20px",
      }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            background: "#fff",
            borderRadius: "15px",
            overflow: "hidden",
            boxShadow: "0 2px 12px rgba(0,0,0,.08)",
            transition: "0.2s",
          }}
        >
          <img
            src={item.image_url}
            alt={item.title}
            style={{
              width: "100%",
              height: "220px",
              objectFit: "cover",
            }}
          />

          <div style={{ padding: "15px" }}>
            <h3>{item.title}</h3>

            <p
              style={{
                color: "#16a34a",
                fontWeight: "bold",
                fontSize: "18px",
              }}
            >
              ₹{item.price}/day
            </p>

            <p>📍 {item.location}</p>
            <div
  style={{
    display: "flex",
    gap: "10px",
    marginTop: "15px",
  }}
>
  <button
    onClick={() => {
      window.location.href = `/edit-item/${item.id}`;
    }}
    style={{
      flex: 1,
      padding: "10px",
      background: "#2563eb",
      color: "white",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
    ✏️ Edit
  </button>

  <button
    onClick={async () => {
      const ok = confirm("Delete this item?");

      if (!ok) return;

      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", item.id);

      if (error) {
        alert(error.message);
        return;
      }

      alert("✅ Item Deleted");

      window.location.reload();
    }}
    style={{
      flex: 1,
      padding: "10px",
      background: "#ef4444",
      color: "white",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
    🗑 Delete
  </button>
</div>
          </div>
        </div>
      ))}
    </div>
  );
}
