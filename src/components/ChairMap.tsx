import { useEffect, useRef, useState } from "react";
import { UK_LOCATIONS, getGroupedLocations } from "../lib/uk-locations";
import type { Location } from "../lib/uk-locations";

// Sample data for demo - will be replaced by Supabase queries
const SAMPLE_DEMAND: Record<string, { have: number; need: number }> = {
  "Central London": { have: 3, need: 8 },
  "North London": { have: 1, need: 5 },
  "South London": { have: 2, need: 4 },
  "East London": { have: 2, need: 6 },
  "West London": { have: 1, need: 3 },
  "Manchester": { have: 2, need: 4 },
  "Birmingham": { have: 1, need: 3 },
  "Leeds": { have: 1, need: 2 },
  "Bristol": { have: 0, need: 2 },
  "Edinburgh": { have: 1, need: 3 },
  "Glasgow": { have: 0, need: 2 },
  "Liverpool": { have: 1, need: 1 },
  "Brighton": { have: 0, need: 2 },
  "Cardiff": { have: 0, need: 1 },
  "Newcastle": { have: 1, need: 2 },
};

export default function ChairMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [selectedLocation, setSelectedLocation] = useState("");
  const grouped = getGroupedLocations();

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    import("leaflet").then((L) => {
      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [54.5, -2.5],
        zoom: 6,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      // Mono grey tile layer
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      // Add labels on top
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 19,
          pane: "shadowPane",
        }
      ).addTo(map);

      // Add markers for locations with demand
      UK_LOCATIONS.forEach((loc) => {
        const demand = SAMPLE_DEMAND[loc.name];
        if (!demand) return;

        const total = demand.have + demand.need;
        const radius = Math.max(8, Math.min(20, total * 3));

        const circle = L.circleMarker([loc.lat, loc.lng], {
          radius,
          fillColor: demand.need > demand.have ? "#10b981" : "#6366f1",
          color: "#fff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.7,
        }).addTo(map);

        circle.bindPopup(`
          <div style="font-family:Inter,system-ui,sans-serif;font-size:13px;line-height:1.5;min-width:140px">
            <strong style="font-size:14px">${loc.name}</strong><br/>
            <span style="color:#10b981;font-weight:600">${demand.need} looking</span> for a chair<br/>
            <span style="color:#6366f1;font-weight:600">${demand.have} available</span> chairs
          </div>
        `);
      });

      mapInstance.current = map;
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const handleLocationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setSelectedLocation(name);
    if (!name || !mapInstance.current) return;

    const loc = UK_LOCATIONS.find((l) => l.name === name);
    if (loc) {
      const zoom = loc.region === "London" ? 12 : 11;
      mapInstance.current.flyTo([loc.lat, loc.lng], zoom, { duration: 1 });
    }
  };

  return (
    <div>
      {/* Location dropdown */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={selectedLocation}
          onChange={handleLocationSelect}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">Jump to location...</option>
          {Object.entries(grouped).map(([group, locations]) => (
            <optgroup key={group} label={group}>
              {locations.map((loc) => (
                <option key={loc.name} value={loc.name}>{loc.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-500"></span>
            Looking for a chair
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-indigo-500"></span>
            Chairs available
          </span>
        </div>
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className="h-[450px] w-full rounded-2xl border border-gray-200 shadow-sm"
      />
    </div>
  );
}
