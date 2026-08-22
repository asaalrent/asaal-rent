"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import Navbar from "@/app/components/Navbar";
import ItemCard from "@/app/components/ItemCard";
function getDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export default function Dashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [distanceFilter, setDistanceFilter] = useState("0");
  
  const [locationName, setLocationName] = useState("");
const [locationFilter, setLocationFilter] = useState("");

  const [userLat, setUserLat] = useState<number | null>(null);
const [userLng, setUserLng] = useState<number | null>(null);

useEffect(() => {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setUserLat(position.coords.latitude);
      setUserLng(position.coords.longitude);
      fetch(
  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
)
  .then((res) => res.json())
  .then((data) => {
    const city =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      "";

    setLocationName(city);
    setLocationFilter(city);
  });
    },
    (error) => {
      
    }
  );
}, []);

useEffect(() => {
  if (userLat !== null && userLng !== null) {
    fetchItems();
  }
}, [userLat, userLng]);

useEffect(() => {
  const updateOffline = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from("profiles")
      .update({
        is_online: false,
        last_seen: new Date().toISOString(),
      })
      .eq("id", user.id);
  };

  window.addEventListener("beforeunload", updateOffline);

  return () => {
    window.removeEventListener("beforeunload", updateOffline);
  };
}, []);

async function fetchItems() {
  const { data, error } = await supabase
  .from("items")
  .select("*")
 
 
  

  
  console.table(data);

  if (error) {
    console.error(error);
    return;
  }

  const list = data || [];

if (userLat !== null && userLng !== null) {
  list.forEach((item: any) => {
    if (item.latitude && item.longitude) {
      item.distance = getDistance(
        userLat,
        userLng,
        item.latitude,
        item.longitude
      );
    } else {
      item.distance = 999999;
    }
  });

  list.sort((a: any, b: any) => a.distance - b.distance);
}

setItems(list);
const {
  data: { user },
} = await supabase.auth.getUser();

if (user) {
  const { data: recent } = await supabase
    .from("recently_viewed")
    .select(`
      viewed_at,
      items (*)
    `)
    .eq("user_id", user.id)
    .order("viewed_at", { ascending: false })
    .limit(10);

  if (recent) {
    const uniqueItems = Array.from(
  new Map(
    recent
      .map((r: any) => r.items)
      .filter(Boolean)
      .map((item: any) => [item.id, item])
  ).values()
);

setRecentItems(uniqueItems);
  }
}
}
  return (
    <div
      style={{
        padding: "30px",
        background: "#f5f5f5",
        minHeight: "100vh",
        fontFamily: "Arial",
      }}
    >
      <Navbar />
      <h1>🏠 Asaal Rent</h1>

      <p>Welcome back 👋</p>

     <input
  type="text"
  placeholder="Search anything to rent..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  style={{
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    marginTop: "20px",
    marginBottom: "30px",
  }}
/>
<p
  style={{
    fontWeight: "bold",
    color: "#16a34a",
    marginBottom: "15px",
  }}
>
  📍 Your Location: {locationName || "Detecting..."}
</p>
<select
  value={distanceFilter}
  onChange={(e) => setDistanceFilter(e.target.value)}
  style={{
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    marginBottom: "30px",
  }}
>
  <option value="0">🌍 Anywhere</option>
  <option value="5">📍 Within 5 km</option>
  <option value="10">📍 Within 10 km</option>
  <option value="25">📍 Within 25 km</option>
  <option value="50">📍 Within 50 km</option>
  <option value="100">📍 Within 100 km</option>
</select>

<select
  value={locationFilter}
  onChange={(e) => setLocationFilter(e.target.value)}
  style={{
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    marginBottom: "30px",
  }}
>
  <option value="">🌍 All Cities</option>

  <option value={locationName}>
    📍 {locationName || "My City"}
  </option>
</select>

      <h2>Categories</h2>
      <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "20px",
    marginTop: "20px",
  }}
>
  {[
  { icon: "🚗", name: "Vehicles" },
  { icon: "🏠", name: "Property" },
  { icon: "📱", name: "Electronics" },
  { icon: "🛠", name: "Tools" },
  { icon: "👗", name: "Fashion" },
  { icon: "🐶", name: "Pets" },
  { icon: "📚", name: "Books" },
  { icon: "📦", name: "Others" },
].map((item) => (
  <div
    key={item.name}
    onClick={() =>
      setSelectedCategory(
        selectedCategory === item.name ? "" : item.name
      )
    }
    style={{
      background:
        selectedCategory === item.name ? "#16a34a" : "white",
      color:
        selectedCategory === item.name ? "white" : "black",
      padding: "25px",
      borderRadius: "15px",
      textAlign: "center",
      cursor: "pointer",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      transition: "0.2s",
    }}
  >
    <h3>
      {item.icon} {item.name}
    </h3>
  </div>
))}
    
</div>
    <div style={{ marginTop: "40px", textAlign: "center" }}>
      {recentItems.length > 0 && (
  <>
    <h2 style={{ marginTop: "40px" }}>🕒 Recently Viewed</h2>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px,1fr))",
        gap: "20px",
        marginTop: "20px",
        marginBottom: "40px",
      }}
    >
      {recentItems.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          distance={item.distance}
        />
      ))}
    </div>
  </>
)}
      <h2 style={{ marginTop: "40px" }}>Latest Items</h2>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    marginTop: "20px",
  }}
>
 {items
  .filter((item) => {
    
    const q = search.toLowerCase();
    const words = q
  .split(" ")
  .filter(
    (word) =>
      word.length > 1 &&
      ![
        "in",
        "at",
        "near",
        "under",
        "below",
        "within",
        "me",
        "my",
        "on",
        "to",
      ].includes(word)
  );
  
    const priceWord = words.find((w) => !isNaN(Number(w)));

const maxPrice = priceWord ? Number(priceWord) : null;

    const text = `
${item.title}
${item.description}
${item.location}
${item.category}
${item.keywords}
`.toLowerCase();

const matchesSearch =
  words.every((word) => text.includes(word));

    const matchesCategory =
      selectedCategory === "" ||
      item.category === selectedCategory;

      const matchesDistance =
  distanceFilter === "0" ||
  (item.distance !== undefined &&
    item.distance <= Number(distanceFilter));

    const matchesPrice =
  maxPrice === null ||
  item.price <= maxPrice;
    
    const matchesLocation =
  locationFilter === "" ||
  item.location?.toLowerCase().includes(
    locationFilter.toLowerCase()
  );

   return (
  matchesSearch &&
  matchesCategory &&
  matchesDistance &&
  matchesPrice
);
  })
  .map((item) => (
    <ItemCard
  key={item.id}
  item={item}
  distance={item.distance}
/>
  ))}
</div>
  <Link href="/upload">
    <button
      style={{
        padding: "15px 30px",
        background: "#16a34a",
        color: "white",
        border: "none",
        borderRadius: "10px",
        fontSize: "18px",
        cursor: "pointer",
      }}
    >
      + Upload Item
    </button>
  </Link>
  <div
  style={{
    marginTop: "15px",
  }}
>
  <Link href="/chat">
    <button
      style={{
        padding: "15px 30px",
        background: "#2563eb",
        color: "white",
        border: "none",
        borderRadius: "10px",
        fontSize: "18px",
        cursor: "pointer",
      }}
    >
      💬 Chats
    </button>
  </Link>
</div>
</div></div>
  );
}