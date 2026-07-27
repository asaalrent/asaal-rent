"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

export default function UserProfilePage() {
  const params = useParams();

  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadUser();
    }
  }, [params.id]);

  async function loadUser() {
    const userId = params.id as string;

    // Profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    setProfile(profileData);

    // User Listings
    const { data: listingData } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setListings(listingData || []);

    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: 40 }}>
        <h2>User not found</h2>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "40px auto",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "25px",
          borderRadius: "15px",
          boxShadow: "0 2px 12px rgba(0,0,0,.1)",
          marginBottom: "30px",
        }}
      >
        <img
          src={profile.avatar_url || "https://placehold.co/150x150"}
          alt=""
          style={{
            width: 130,
            height: 130,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />

        <h1>{profile.full_name}</h1>

        <p>{profile.bio}</p>

        <h4>📍 {profile.city}</h4>

        <h4>📞 {profile.phone}</h4>

        {profile.verified && (
          <h3 style={{ color: "green" }}>✔ Verified User</h3>
        )}
      </div>

      <h2>User Listings</h2>

      {listings.length === 0 ? (
        <h3>No listings found.</h3>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
            gap: "20px",
          }}
        >
          {listings.map((item) => (
            <div
              key={item.id}
              style={{
                background: "white",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 2px 10px rgba(0,0,0,.1)",
              }}
            >
              <img
                src={item.image_url}
                alt=""
                style={{
                  width: "100%",
                  height: 180,
                  objectFit: "cover",
                }}
              />

              <div style={{ padding: 15 }}>
                <h3>{item.title}</h3>

                <h4>₹ {item.price}/day</h4>

                <p>{item.location}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}