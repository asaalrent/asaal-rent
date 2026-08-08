"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }
    const {
  data: { user },
} = await supabase.auth.getUser();

if (user) {
  await supabase
    .from("profiles")
    .update({
      is_online: true,
      last_seen: new Date().toISOString(),
    })
    .eq("id", user.id);
}

    alert("Login Successful!");
    router.push("/dashboard");
  }

  async function signup() {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

   if (data.user) {
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: data.user.id,
      full_name: email.split("@")[0],
      email: email,
    });

  console.log("USER =", data.user);
console.log("PROFILE ERROR =", profileError);
  if (profileError) {
    alert(profileError.message);
  }
}

    alert("Account Created Successfully!");
  }

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "80px auto",
        padding: "30px",
        background: "#ffffff",
        borderRadius: "15px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
        fontFamily: "Arial",
      }}
    >
      <h1 style={{ textAlign: "center" }}>🔐 Asaal Rent</h1>

      <input
        type="email"
        placeholder="Enter Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          marginTop: "20px",
          borderRadius: "8px",
          border: "1px solid #ccc",
        }}
      />

      <input
        type="password"
        placeholder="Enter Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          marginTop: "15px",
          borderRadius: "8px",
          border: "1px solid #ccc",
        }}
      />

      <button
        onClick={login}
        style={{
          width: "100%",
          padding: "14px",
          marginTop: "20px",
          background: "#16a34a",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        Login
      </button>

      <button
        onClick={signup}
        style={{
          width: "100%",
          padding: "14px",
          marginTop: "10px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        Create Account
      </button>
    </div>
  );
}