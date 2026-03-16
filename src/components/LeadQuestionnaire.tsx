import { useState } from "react";

interface FormData {
  business_type: string;
  locations: number;
  staff: number;
  years_in_business: string;
  has_website: string;
  website_url: string;
  instagram: string;
  facebook: string;
  google_maps: string;
  name: string;
  email: string;
  phone: string;
  business_name: string;
}

interface ScoreResult {
  total: number;
  digital_presence: number;
  business_size: number;
  seo_opportunity: number;
  recommendations: string[];
  effort_level: string;
  tier: string;
}

const STEPS = [
  "Business",
  "Online Presence",
  "Your Details",
  "Results",
];

function calculateScore(data: FormData): ScoreResult {
  let digital_presence = 0;
  let business_size = 0;
  const recommendations: string[] = [];

  // Digital presence scoring (0-40)
  if (data.has_website === "yes" && data.website_url) {
    digital_presence += 10;
  } else {
    recommendations.push("You don't have a website. This is the single biggest thing you can do to get found online. We can build one for you.");
  }

  if (data.instagram && data.instagram.trim() !== "") {
    digital_presence += 8;
  } else {
    recommendations.push("No Instagram presence. For a visual business like yours, Instagram is where your clients discover you.");
  }

  if (data.facebook && data.facebook.trim() !== "") {
    digital_presence += 7;
  } else {
    recommendations.push("No Facebook page. Many local customers still search Facebook for nearby businesses.");
  }

  if (data.google_maps && data.google_maps.trim() !== "") {
    digital_presence += 15;
  } else {
    recommendations.push("No Google Maps listing found. This is critical. Most clients search 'barber near me' or 'hairdresser near me'. Without a Google Business Profile, you're invisible in local search.");
  }

  // Business size scoring (0-30)
  if (data.locations >= 3) {
    business_size += 15;
  } else if (data.locations === 2) {
    business_size += 10;
  } else {
    business_size += 5;
  }

  if (data.staff >= 10) {
    business_size += 15;
  } else if (data.staff >= 5) {
    business_size += 10;
  } else if (data.staff >= 2) {
    business_size += 7;
  } else {
    business_size += 3;
  }

  // Years in business bonus
  const yearsMap: Record<string, number> = {
    "less-than-1": 0,
    "1-3": 5,
    "3-5": 10,
    "5-10": 15,
    "10+": 20,
  };
  const years_bonus = yearsMap[data.years_in_business] || 0;

  // SEO opportunity is inverse of digital presence
  const seo_opportunity = 40 - digital_presence;

  const total = digital_presence + business_size + years_bonus;

  // Effort level
  let effort_level: string;
  let tier: string;
  if (digital_presence <= 10) {
    effort_level = "High";
    tier = "Full build recommended: website, Google Business Profile, social setup, and SEO.";
  } else if (digital_presence <= 25) {
    effort_level = "Medium";
    tier = "Good foundations but gaps to fill. SEO optimisation and missing channels will make a big difference.";
  } else {
    effort_level = "Low";
    tier = "Strong digital presence. Fine-tuning SEO and connecting your systems with Apptmint will maximise what you already have.";
  }

  if (recommendations.length === 0) {
    recommendations.push("Your digital presence looks solid. Apptmint can connect everything together and automate the admin.");
  }

  return { total, digital_presence, business_size, seo_opportunity, recommendations, effort_level, tier };
}

export default function LeadQuestionnaire() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [data, setData] = useState<FormData>({
    business_type: "",
    locations: 1,
    staff: 1,
    years_in_business: "",
    has_website: "",
    website_url: "",
    instagram: "",
    facebook: "",
    google_maps: "",
    name: "",
    email: "",
    phone: "",
    business_name: "",
  });

  const update = (field: keyof FormData, value: string | number) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (step === 0) return data.business_type !== "" && data.years_in_business !== "";
    if (step === 1) return data.has_website !== "";
    if (step === 2) return data.name !== "" && data.email !== "" && data.business_name !== "";
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    const result = calculateScore(data);
    setScore(result);

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const url = (import.meta as any).env?.PUBLIC_SUPABASE_URL;
      const key = (import.meta as any).env?.PUBLIC_SUPABASE_ANON_KEY;

      if (url && key) {
        const supabase = createClient(url, key);
        await supabase.from("leads").insert({
          business_type: data.business_type,
          business_name: data.business_name,
          locations: data.locations,
          staff: data.staff,
          years_in_business: data.years_in_business,
          has_website: data.has_website === "yes",
          website_url: data.website_url || null,
          instagram: data.instagram || null,
          facebook: data.facebook || null,
          google_maps: data.google_maps || null,
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          score_total: result.total,
          score_digital: result.digital_presence,
          score_business: result.business_size,
          score_seo_opportunity: result.seo_opportunity,
          effort_level: result.effort_level,
        });
      } else {
        // Fallback to Netlify Forms
        const payload: Record<string, string> = {
          "form-name": "lead-questionnaire",
          business_type: data.business_type,
          business_name: data.business_name,
          locations: String(data.locations),
          staff: String(data.staff),
          years_in_business: data.years_in_business,
          has_website: data.has_website,
          website_url: data.website_url,
          instagram: data.instagram,
          facebook: data.facebook,
          google_maps: data.google_maps,
          name: data.name,
          email: data.email,
          phone: data.phone,
          score_total: String(result.total),
          score_digital: String(result.digital_presence),
          score_business: String(result.business_size),
          score_seo_opportunity: String(result.seo_opportunity),
          effort_level: result.effort_level,
        };
        await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(payload).toString(),
        });
      }
    } catch (err) {
      console.error("Form submission failed:", err);
    }

    setLoading(false);
    setSubmitted(true);
    setStep(3);
  };

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

  const optionBtn = (selected: boolean) =>
    `flex-1 rounded-lg border-2 px-4 py-3 text-center text-sm font-medium transition-all duration-200 cursor-pointer ${
      selected
        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
    }`;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress bar */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  i <= step
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {i < step ? (
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`mt-2 hidden text-xs font-medium sm:block ${i <= step ? "text-emerald-600" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="relative mt-3 h-1 rounded-full bg-gray-100">
          <div
            className="absolute left-0 top-0 h-1 rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Business */}
      {step === 0 && (
        <div className="space-y-6">
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-900">What type of business do you run?</label>
            <div className="flex gap-3">
              {[
                { value: "barber", label: "Barber" },
                { value: "hairdresser", label: "Hairdresser" },
                { value: "both", label: "Both" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("business_type", opt.value)}
                  className={optionBtn(data.business_type === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">Number of locations</label>
              <input
                type="number"
                min="1"
                value={data.locations}
                onChange={(e) => update("locations", parseInt(e.target.value) || 1)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">Number of staff</label>
              <input
                type="number"
                min="1"
                value={data.staff}
                onChange={(e) => update("staff", parseInt(e.target.value) || 1)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-900">How long have you been in business?</label>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {[
                { value: "less-than-1", label: "< 1 year" },
                { value: "1-3", label: "1-3 years" },
                { value: "3-5", label: "3-5 years" },
                { value: "5-10", label: "5-10 years" },
                { value: "10+", label: "10+ years" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("years_in_business", opt.value)}
                  className={optionBtn(data.years_in_business === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Online presence */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-900">Do you have a website?</label>
            <div className="flex gap-3">
              <button type="button" onClick={() => update("has_website", "yes")} className={optionBtn(data.has_website === "yes")}>Yes</button>
              <button type="button" onClick={() => update("has_website", "no")} className={optionBtn(data.has_website === "no")}>No</button>
            </div>
          </div>

          {data.has_website === "yes" && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">Website URL</label>
              <input
                type="url"
                value={data.website_url}
                onChange={(e) => update("website_url", e.target.value)}
                placeholder="https://www.yourshop.co.uk"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-900">Instagram handle</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">@</span>
              <input
                type="text"
                value={data.instagram}
                onChange={(e) => update("instagram", e.target.value)}
                placeholder="yourshopname"
                className={`${inputClass} pl-8`}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-900">Facebook page URL</label>
            <input
              type="text"
              value={data.facebook}
              onChange={(e) => update("facebook", e.target.value)}
              placeholder="https://facebook.com/yourshop or page name"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-900">Google Maps / Google Business Profile link</label>
            <input
              type="text"
              value={data.google_maps}
              onChange={(e) => update("google_maps", e.target.value)}
              placeholder="Paste your Google Maps link or business name"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">Search your business on Google Maps and paste the link here</p>
          </div>
        </div>
      )}

      {/* Step 3: Contact details */}
      {step === 2 && (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">Nearly there. We'll send your results and recommendations to your email.</p>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-900">Your name</label>
            <input type="text" value={data.name} onChange={(e) => update("name", e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-900">Business name</label>
            <input type="text" value={data.business_name} onChange={(e) => update("business_name", e.target.value)} required className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">Email</label>
              <input type="email" value={data.email} onChange={(e) => update("email", e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">Phone (optional)</label>
              <input type="tel" value={data.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 3 && score && (
        <div className="space-y-8">
          <div className="text-center">
            <h3 className="text-2xl font-black text-gray-900">Your Digital Score</h3>
            <div className="relative mx-auto mt-6 flex h-36 w-36 items-center justify-center">
              <svg className="absolute inset-0" viewBox="0 0 144 144">
                <circle cx="72" cy="72" r="64" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="72" cy="72" r="64"
                  fill="none"
                  stroke={score.total >= 60 ? "#10b981" : score.total >= 35 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(score.total / 90) * 402} 402`}
                  transform="rotate(-90 72 72)"
                />
              </svg>
              <div>
                <p className="text-4xl font-black text-gray-900">{score.total}</p>
                <p className="text-xs text-gray-400">out of 90</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-2xl font-black text-gray-900">{score.digital_presence}<span className="text-sm font-normal text-gray-400">/40</span></p>
              <p className="mt-1 text-xs font-medium text-gray-500">Digital Presence</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-2xl font-black text-gray-900">{score.business_size}<span className="text-sm font-normal text-gray-400">/30</span></p>
              <p className="mt-1 text-xs font-medium text-gray-500">Business Size</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-2xl font-black text-emerald-600">{score.seo_opportunity}<span className="text-sm font-normal text-gray-400">/40</span></p>
              <p className="mt-1 text-xs font-medium text-gray-500">SEO Opportunity</p>
            </div>
          </div>

          <div className={`rounded-xl border-2 p-6 ${
            score.effort_level === "High" ? "border-red-200 bg-red-50" :
            score.effort_level === "Medium" ? "border-yellow-200 bg-yellow-50" :
            "border-emerald-200 bg-emerald-50"
          }`}>
            <div className="flex items-center gap-3">
              <span className={`rounded-lg px-3 py-1 text-xs font-bold uppercase ${
                score.effort_level === "High" ? "bg-red-100 text-red-700" :
                score.effort_level === "Medium" ? "bg-yellow-100 text-yellow-700" :
                "bg-emerald-100 text-emerald-700"
              }`}>
                {score.effort_level} effort
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">{score.tier}</p>
          </div>

          <div>
            <h4 className="font-bold text-gray-900">Recommendations</h4>
            <ul className="mt-3 space-y-3">
              {score.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-500">We'll be in touch with a detailed breakdown and clear pricing within 24 hours.</p>
            <a
              href="/contact/"
              className="mt-4 inline-flex rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25"
            >
              Book a Call to Discuss
            </a>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      {step < 3 && (
        <div className="mt-10 flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              Back
            </button>
          ) : (
            <div />
          )}
          {step < 2 ? (
            <button
              onClick={() => canProceed() && setStep(step + 1)}
              disabled={!canProceed()}
              className="rounded-lg bg-emerald-500 px-8 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || loading}
              className="rounded-lg bg-emerald-500 px-8 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500"
            >
              {loading ? "Calculating..." : "See My Score"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
