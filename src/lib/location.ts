// Structured location system. Geocoding via OpenStreetMap Nominatim.
// Provider is isolated here — swap to Google Places later without touching UI.

import { useCallback, useEffect, useState } from "react";

export interface Place {
  locality: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  /** Human-readable short label, e.g. "Vesu, Surat" or "Surat" */
  label: string;
}

export type LocationScope = "anywhere" | "city" | "locality";

export interface LocationFilter {
  scope: LocationScope;
  city?: string | null;
  locality?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** Reserved for future radius search. */
  radiusKm?: number;
}

export const ANYWHERE: LocationFilter = { scope: "anywhere" };

const STORAGE_KEY = "intent.activeLocation.v1";

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export function loadStoredLocation(): Place | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Place;
  } catch {
    return null;
  }
}

export function saveStoredLocation(p: Place | null) {
  if (typeof window === "undefined") return;
  if (!p) window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

// ---------------------------------------------------------------------------
// Place <-> Filter helpers
// ---------------------------------------------------------------------------

export function placeToFilter(p: Place | null): LocationFilter {
  if (!p) return ANYWHERE;
  if (p.locality && p.city) {
    return {
      scope: "locality",
      locality: p.locality,
      city: p.city,
      lat: p.lat,
      lng: p.lng,
    };
  }
  if (p.city) {
    return { scope: "city", city: p.city, lat: p.lat, lng: p.lng };
  }
  return ANYWHERE;
}

export function placeLabel(p: Place | null, fallback = "Anywhere"): string {
  if (!p) return fallback;
  if (p.label) return p.label;
  if (p.locality && p.city) return `${p.locality}, ${p.city}`;
  return p.city ?? p.state ?? p.country ?? fallback;
}

// ---------------------------------------------------------------------------
// Apply filter to a Supabase query (chainable)
// ---------------------------------------------------------------------------
// Typed loosely on purpose so callers can pass any PostgREST builder.
// Future radius: branch on filter.radiusKm and use a PostGIS RPC.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyLocationFilter<T extends { eq: (col: string, val: any) => T }>(
  query: T,
  filter: LocationFilter,
): T {
  if (filter.scope === "anywhere") return query;
  if (filter.scope === "city" && filter.city) {
    return query.eq("city", filter.city);
  }
  if (filter.scope === "locality" && filter.city && filter.locality) {
    return query.eq("city", filter.city).eq("locality", filter.locality);
  }
  return query;
}

// ---------------------------------------------------------------------------
// Nominatim provider
// ---------------------------------------------------------------------------

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

interface NominatimAddress {
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  city_district?: string;
  state_district?: string;
  county?: string;
  state?: string;
  country?: string;
  road?: string;
}

interface NominatimResult {
  place_id: number | string;
  osm_type?: string;
  osm_id?: number | string;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  class?: string;
  address?: NominatimAddress;
}

function pickLocality(addr: NominatimAddress | undefined): string | null {
  if (!addr) return null;
  return (
    addr.neighbourhood ||
    addr.suburb ||
    addr.city_district ||
    addr.village ||
    addr.road ||
    null
  );
}

function pickCity(addr: NominatimAddress | undefined): string | null {
  if (!addr) return null;
  return (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.county ||
    addr.state_district ||
    null
  );
}

function shortLabel(result: NominatimResult): string {
  const addr = result.address;
  const locality = pickLocality(addr);
  const city = pickCity(addr);
  const headline = result.name && result.name !== city ? result.name : locality;
  if (headline && city && headline !== city) return `${headline}, ${city}`;
  if (city) return city;
  if (addr?.state) return addr.state;
  return result.display_name.split(",")[0] ?? result.display_name;
}

function toPlace(result: NominatimResult): Place {
  const addr = result.address ?? {};
  const city = pickCity(addr);
  const localityRaw = pickLocality(addr);
  // If the result IS a city, don't also treat its name as a locality.
  const locality =
    localityRaw && city && localityRaw.toLowerCase() === city.toLowerCase()
      ? null
      : localityRaw;
  return {
    locality,
    city,
    state: addr.state ?? null,
    country: addr.country ?? null,
    lat: Number(result.lat),
    lng: Number(result.lon),
    place_id:
      result.osm_type && result.osm_id
        ? `osm:${result.osm_type}/${result.osm_id}`
        : `nominatim:${result.place_id}`,
    label: shortLabel(result),
  };
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "8");
  // Bias to India for relevance; remove or widen when going global.
  url.searchParams.set("countrycodes", "in");
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) return [];
  const data = (await res.json()) as NominatimResult[];
  return data.map(toPlace);
}

export async function reverseGeocode(lat: number, lng: number): Promise<Place | null> {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "14");
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = (await res.json()) as NominatimResult;
  if (!data) return null;
  return toPlace(data);
}

export async function getCurrentPlace(): Promise<Place> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Location not supported on this device");
  }
  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 60_000,
    });
  });
  const place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
  if (!place) throw new Error("Couldn't read your location");
  return place;
}

// ---------------------------------------------------------------------------
// useActiveLocation — localStorage-backed selection used by Home/Explore pill
// ---------------------------------------------------------------------------

export function useActiveLocation() {
  const [place, setPlaceState] = useState<Place | null>(() => loadStoredLocation());

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setPlaceState(loadStoredLocation());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPlace = useCallback((p: Place | null) => {
    saveStoredLocation(p);
    setPlaceState(p);
  }, []);

  return {
    place,
    setPlace,
    filter: placeToFilter(place),
    label: placeLabel(place),
  };
}
