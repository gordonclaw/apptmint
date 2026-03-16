import { useState } from "react";
import { getGroupedLocations } from "../lib/uk-locations";

type FormType = "have" | "need" | null;

interface FormData {
  type: "have" | "need";
  name: string;
  email: string;
  phone: string;
  location: string;
  postcode: string;
  // "have" fields
  shop_name?: string;
  chairs_available?: string;
  available_days?: string[];
  price_per_day?: string;
  description?: string;
  // "need" fields
  days_wanted?: string[];
  max_budget?: string;
  experience_years?: string;
  specialities?: string;
  has_own_tools?: boolean;
  has_own_clients?: boolean;
  bio?: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ChairForm() {
  const [formType, setFormType] = useState<FormType>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const data = new FormData(form);

    const payload: Record<string, unknown> = {
      type: formType,
      name: data.get("name"),
      email: data.get("email"),
      phone: data.get("phone"),
      location: data.get("location"),
      postcode: data.get("postcode"),
      days: selectedDays,
    };

    if (formType === "have") {
      payload.shop_name = data.get("shop_name");
      payload.chairs_available = data.get("chairs_available");
      payload.price_per_day = data.get("price_per_day");
      payload.description = data.get("description");
    } else {
      payload.max_budget = data.get("max_budget");
      payload.experience_years = data.get("experience_years");
      payload.specialities = data.get("specialities");
      payload.has_own_tools = data.get("has_own_tools") === "on";
      payload.has_own_clients = data.get("has_own_clients") === "on";
      payload.bio = data.get("bio");
    }

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = (import.meta as any).env?.PUBLIC_SUPABASE_URL;
      const supabaseKey = (import.meta as any).env?.PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        // Fallback: store in Netlify form
        const netlifyForm = document.createElement("form");
        netlifyForm.setAttribute("data-netlify", "true");
        netlifyForm.setAttribute("name", "chair-rental");
        netlifyForm.style.display = "none";

        Object.entries(payload).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.name = key;
          input.value = Array.isArray(value)
            ? value.join(", ")
            : String(value ?? "");
          netlifyForm.appendChild(input);
        });

        document.body.appendChild(netlifyForm);

        await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(
            Object.fromEntries(
              Object.entries(payload).map(([k, v]) => [
                k,
                Array.isArray(v) ? v.join(", ") : String(v ?? ""),
              ])
            )
          ).toString() + "&form-name=chair-rental",
        });

        document.body.removeChild(netlifyForm);
        setSubmitted(true);
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      if (formType === "have") {
        const { error: dbError } = await supabase.from("chair_listings").insert({
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          location: payload.location,
          postcode: payload.postcode,
          shop_name: payload.shop_name,
          chairs_available: Number(payload.chairs_available) || 1,
          available_days: selectedDays,
          price_per_day_pence: Math.round(Number(payload.price_per_day || 0) * 100),
          description: payload.description,
          status: "active",
        });
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase.from("chair_wanted").insert({
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          location_text: payload.location,
          postcode: payload.postcode,
          days_wanted: selectedDays,
          max_budget_pence_daily: Math.round(Number(payload.max_budget || 0) * 100),
          experience_years: Number(payload.experience_years) || 0,
          specialities: payload.specialities,
          has_own_tools: payload.has_own_tools,
          has_own_clients: payload.has_own_clients,
          bio: payload.bio,
          status: "active",
        });
        if (dbError) throw dbError;
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setError("Something went wrong. Please try again or email hello@apptmint.co.uk");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg className="h-7 w-7 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-bold text-gray-900">You're listed</h3>
        <p className="mt-2 text-sm text-gray-500">
          We'll be in touch when we find a match. This service is completely free.
        </p>
      </div>
    );
  }

  if (!formType) {
    return (
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
        <button
          onClick={() => setFormType("have")}
          className="group flex flex-col items-center rounded-2xl border-2 border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500 hover:shadow-xl"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">I have a chair</h3>
          <p className="mt-2 text-sm text-gray-500">List your empty chair or station for freelancers to rent</p>
        </button>

        <button
          onClick={() => setFormType("need")}
          className="group flex flex-col items-center rounded-2xl border-2 border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500 hover:shadow-xl"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">I need a chair</h3>
          <p className="mt-2 text-sm text-gray-500">Find available chairs and stations near you</p>
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

  return (
    <div className="mx-auto max-w-lg">
      <button
        onClick={() => { setFormType(null); setSelectedDays([]); setError(""); }}
        className="mb-6 flex items-center gap-1 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8">
        <h3 className="text-lg font-bold text-gray-900">
          {formType === "have" ? "List your chair" : "Find a chair"}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {formType === "have"
            ? "Tell us about your space and availability."
            : "Tell us what you're looking for."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Common fields */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Your name</label>
            <input type="text" name="name" required className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <input type="email" name="email" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
              <input type="tel" name="phone" required className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Area / Town</label>
              <select name="location" required className={inputClass} defaultValue="">
                <option value="" disabled>Select location...</option>
                {Object.entries(getGroupedLocations()).map(([group, locations]) => (
                  <optgroup key={group} label={group}>
                    {locations.map((loc) => (
                      <option key={loc.name} value={loc.name}>{loc.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Postcode</label>
              <input type="text" name="postcode" required placeholder="e.g. NW1 8QE" className={inputClass} />
            </div>
          </div>

          {/* "I have a chair" fields */}
          {formType === "have" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Shop / salon name</label>
                <input type="text" name="shop_name" required className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Chairs available</label>
                  <input type="number" name="chairs_available" min="1" defaultValue="1" required className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Price per day</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">£</span>
                    <input type="number" name="price_per_day" min="0" step="5" required placeholder="40" className={`${inputClass} pl-7`} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* "I need a chair" fields */}
          {formType === "need" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Max budget per day</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">£</span>
                    <input type="number" name="max_budget" min="0" step="5" required placeholder="45" className={`${inputClass} pl-7`} />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Years experience</label>
                  <input type="number" name="experience_years" min="0" required className={inputClass} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Specialities</label>
                <input type="text" name="specialities" placeholder="e.g. fades, unisex, colour" className={inputClass} />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="has_own_tools" className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500/20" />
                  Own tools
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="has_own_clients" className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500/20" />
                  Own client base
                </label>
              </div>
            </>
          )}

          {/* Days - shared */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {formType === "have" ? "Available days" : "Days wanted"}
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                    selectedDays.includes(day)
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "border border-gray-200 bg-white text-gray-500 hover:border-emerald-300"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Description / bio */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {formType === "have" ? "Anything else about the space?" : "Tell us about yourself"}
            </label>
            <textarea
              name={formType === "have" ? "description" : "bio"}
              rows={3}
              placeholder={formType === "have" ? "e.g. mirror station, products included, parking nearby" : "e.g. recently qualified, specialise in fades, friendly and reliable"}
              className={`${inputClass} resize-y`}
            />
          </div>

          {/* GDPR consent */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <label className="flex items-start gap-3 text-sm text-gray-600">
              <input type="checkbox" name="gdpr_consent" required className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500/20" />
              <span>
                I consent to Apptmint storing my details to match me with available chairs/barbers.
                My data will be retained for 2 years and I can request deletion at any time by emailing
                <a href="mailto:hello@apptmint.co.uk" className="font-medium text-emerald-600 hover:underline"> hello@apptmint.co.uk</a>.
                See our <a href="/privacy/" className="font-medium text-emerald-600 hover:underline">privacy policy</a>.
              </span>
            </label>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || selectedDays.length === 0}
            className="w-full rounded-lg bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:hover:bg-emerald-500 disabled:hover:shadow-none"
          >
            {loading ? "Submitting..." : "List for Free"}
          </button>
          <p className="text-center text-xs text-gray-400">
            Completely free. No commission, no fees, no catch.
          </p>
        </form>
      </div>
    </div>
  );
}
