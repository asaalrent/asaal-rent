"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState } from "react";
import L from "leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function LocationMarker({
  onLocationChange,
}: {
  onLocationChange: (lat: number, lng: number) => void;
}) {
  const [position, setPosition] = useState<[number, number]>([22.3039, 70.8022]);

  useMapEvents({
    click(e) {
  setPosition([e.latlng.lat, e.latlng.lng]);

  onLocationChange(e.latlng.lat, e.latlng.lng);
},
  });

  return <Marker position={position} />;
}

export default function Map({
  onLocationChange,
}: {
  onLocationChange: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer
      center={[22.3039, 70.8022]}
      zoom={13}
      style={{ height: "400px", width: "100%", borderRadius: "10px" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <LocationMarker onLocationChange={onLocationChange} />
    </MapContainer>
  );
}