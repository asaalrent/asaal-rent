"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setUsers(data || []);
    setLoading(false);
  }

  if (loading) {
    return <h2 style={{ padding: 30 }}>Loading Users...</h2>;
  }

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "40px auto",
        padding: "20px",
      }}
    >
      <h1>👥 Manage Users</h1>

      <input
        type="text"
        placeholder="Search user..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          margin: "20px 0",
          borderRadius: "10px",
          border: "1px solid #ddd",
        }}
      />

      <div
        style={{
          display: "grid",
          gap: "20px",
        }}
      >
        {users
          .filter((user) => {
            const q = search.toLowerCase();

            return (
              user.full_name?.toLowerCase().includes(q) ||
              user.email?.toLowerCase().includes(q) ||
              user.city?.toLowerCase().includes(q)
            );
          })
          .map((user) => (
            <div
              key={user.id}
              style={{
                background: "#fff",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 2px 10px rgba(0,0,0,.1)",
              }}
            >
              <h3>{user.full_name || "No Name"}</h3>

              <p>📧 {user.email}</p>

              <p>📍 {user.city || "No City"}</p>

              <p>📞 {user.phone || "No Phone"}</p>

              <p>
                Status :{" "}
                {user.verified ? "✅ Verified" : "❌ Not Verified"}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}