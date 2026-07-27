"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

export default function DevPage() {
  const router = useRouter();

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div
      style={{
        maxWidth: 500,
        margin: "100px auto",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <h1>Developer Login</h1>

      <button
        onClick={() =>
          login("chauhansahil2305@gmail.com", "sahil@2003")
        }
      >
        Login as Owner
      </button>

      <button
        onClick={() =>
          login("chauhansahil2305+test@gmail.com", "sahil@2003")
        }
      >
        Login as Renter
      </button>
    </div>
  );
}