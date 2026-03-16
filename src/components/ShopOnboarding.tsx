import { useState } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIMES = Array.from({ length: 30 }, (_, i) => {
  const h = Math.floor(i / 2) + 6; // 06:00 to 20:30
  const m = i % 2 === 0 ? "00" : "30";
  return `${h.toString().padStart(2, "0")}:${m}`;
});

const STEPS = ["Your Shop", "Opening Hours", "Staff", "Services", "Pricing Rules"];

interface DayHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStart: string;
  breakEnd: string;
  hasBreak: boolean;
}

interface StaffMember {
  name: string;
  role: string;
  phone: string;
  days: boolean[]; // Mon-Sun
  startTime: string;
  endTime: string;
}

interface Service {
  name: string;
  durationMins: number;
  pricePounds: string;
}

interface PricingRule {
  name: string;
  ruleType: string; // discount, surcharge
  amountType: string; // percentage, fixed
  amount: string;
  days: boolean[];
  timeStart: string;
  timeEnd: string;
}

export default function ShopOnboarding() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Step 1: Shop details
  const [shop, setShop] = useState({
    name: "", address1: "", address2: "", city: "", postcode: "",
    phone: "", email: "", whatsapp: "", businessType: "",
    description: "", instagram: "", facebook: "", googleMaps: "",
    cancellationPolicy: "24h", noShowPolicy: "none", paddingMins: "0",
  });

  // Step 2: Opening hours
  const [hours, setHours] = useState<DayHours[]>(
    DAYS.map(() => ({
      isOpen: true, openTime: "09:00", closeTime: "18:00",
      breakStart: "13:00", breakEnd: "14:00", hasBreak: false,
    }))
  );

  // Step 3: Staff
  const [staffList, setStaffList] = useState<StaffMember[]>([
    { name: "", role: "barber", phone: "", days: [true, true, true, true, true, false, false], startTime: "09:00", endTime: "18:00" },
  ]);

  // Step 4: Services
  const [serviceList, setServiceList] = useState<Service[]>([
    { name: "", durationMins: 30, pricePounds: "" },
  ]);

  // Step 5: Pricing rules
  const [rules, setRules] = useState<PricingRule[]>([]);

  const updateShop = (field: string, value: string) => setShop((prev) => ({ ...prev, [field]: value }));

  const updateHours = (dayIdx: number, field: keyof DayHours, value: string | boolean) => {
    setHours((prev) => prev.map((d, i) => i === dayIdx ? { ...d, [field]: value } : d));
  };

  const updateStaff = (idx: number, field: keyof StaffMember, value: any) => {
    setStaffList((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const toggleStaffDay = (staffIdx: number, dayIdx: number) => {
    setStaffList((prev) => prev.map((s, i) => {
      if (i !== staffIdx) return s;
      const days = [...s.days];
      days[dayIdx] = !days[dayIdx];
      return { ...s, days };
    }));
  };

  const updateService = (idx: number, field: keyof Service, value: string | number) => {
    setServiceList((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const updateRule = (idx: number, field: keyof PricingRule, value: any) => {
    setRules((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const toggleRuleDay = (ruleIdx: number, dayIdx: number) => {
    setRules((prev) => prev.map((r, i) => {
      if (i !== ruleIdx) return r;
      const days = [...r.days];
      days[dayIdx] = !days[dayIdx];
      return { ...r, days };
    }));
  };

  const canProceed = () => {
    if (step === 0) return shop.name && shop.address1 && shop.city && shop.postcode && shop.phone && shop.email && shop.businessType;
    if (step === 1) return hours.some((d) => d.isOpen);
    if (step === 2) return staffList.length > 0 && staffList[0].name;
    if (step === 3) return serviceList.length > 0 && serviceList[0].name && serviceList[0].pricePounds;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const url = (import.meta as any).env?.PUBLIC_SUPABASE_URL;
      const key = (import.meta as any).env?.PUBLIC_SUPABASE_ANON_KEY;

      if (url && key) {
        const supabase = createClient(url, key);

        // 1. Insert shop
        const { data: shopData, error: shopErr } = await supabase.from("shops").insert({
          name: shop.name,
          address_line1: shop.address1,
          address_line2: shop.address2 || null,
          city: shop.city,
          postcode: shop.postcode,
          phone: shop.phone,
          email: shop.email,
          whatsapp_number: shop.whatsapp || null,
          business_type: shop.businessType,
          gdpr_consent: true,
        }).select("id").single();

        if (shopErr) throw shopErr;
        const shopId = shopData.id;

        // 2. Insert opening hours
        const hoursRows = hours.map((h, i) => ({
          shop_id: shopId,
          day_of_week: i,
          is_open: h.isOpen,
          open_time: h.isOpen ? h.openTime : null,
          close_time: h.isOpen ? h.closeTime : null,
          break_start: h.isOpen && h.hasBreak ? h.breakStart : null,
          break_end: h.isOpen && h.hasBreak ? h.breakEnd : null,
        }));
        await supabase.from("opening_hours").insert(hoursRows);

        // 3. Insert staff + their hours
        for (const s of staffList) {
          if (!s.name) continue;
          const { data: staffData } = await supabase.from("staff").insert({
            shop_id: shopId, name: s.name, role: s.role, phone: s.phone || null,
          }).select("id").single();

          if (staffData) {
            const staffHours = s.days.map((working, dayIdx) => ({
              staff_id: staffData.id, day_of_week: dayIdx, is_working: working,
              start_time: working ? s.startTime : null, end_time: working ? s.endTime : null,
            }));
            await supabase.from("staff_hours").insert(staffHours);
          }
        }

        // 4. Insert services
        for (const svc of serviceList) {
          if (!svc.name || !svc.pricePounds) continue;
          await supabase.from("services").insert({
            shop_id: shopId, name: svc.name, duration_mins: svc.durationMins,
            base_price_pence: Math.round(parseFloat(svc.pricePounds) * 100),
          });
        }

        // 5. Insert pricing rules
        for (const rule of rules) {
          if (!rule.name || !rule.amount) continue;
          await supabase.from("pricing_rules").insert({
            shop_id: shopId, name: rule.name, rule_type: rule.ruleType,
            amount_type: rule.amountType,
            amount: rule.amountType === "percentage" ? parseInt(rule.amount) : Math.round(parseFloat(rule.amount) * 100),
            days: rule.days.map((d, i) => d ? i : -1).filter((d) => d >= 0),
            time_start: rule.timeStart || null, time_end: rule.timeEnd || null,
          });
        }
      } else {
        // Fallback: Netlify form
        await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            "form-name": "shop-onboarding",
            shop_name: shop.name, city: shop.city, postcode: shop.postcode,
            phone: shop.phone, email: shop.email, business_type: shop.businessType,
            staff_count: String(staffList.filter((s) => s.name).length),
            services_count: String(serviceList.filter((s) => s.name).length),
            pricing_rules_count: String(rules.length),
            full_data: JSON.stringify({ shop, hours, staffList, serviceList, rules }),
          }).toString(),
        });
      }
      setSubmitted(true);
    } catch (err) {
      console.error("Onboarding failed:", err);
      alert("Something went wrong. Please try again or email hello@apptmint.co.uk");
    }
    setLoading(false);
  };

  const inputClass = "w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";
  const selectClass = inputClass;
  const optBtn = (sel: boolean) => `rounded-lg border-2 px-3 py-2.5 text-center text-sm font-medium transition-all duration-200 cursor-pointer ${sel ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`;
  const dayBtn = (sel: boolean) => `rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 cursor-pointer ${sel ? "bg-emerald-500 text-white" : "border border-gray-200 bg-white text-gray-500 hover:border-emerald-300"}`;

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg className="h-7 w-7 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
        </div>
        <h3 className="mt-4 text-lg font-bold text-gray-900">You're all set</h3>
        <p className="mt-2 text-sm text-gray-500">
          We've got everything we need to set up your shop. We'll be in touch within one working day to get you live.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${i <= step ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                {i < step ? <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg> : i + 1}
              </div>
              <span className={`mt-2 hidden text-[10px] font-medium sm:block ${i <= step ? "text-emerald-600" : "text-gray-400"}`}>{label}</span>
            </div>
          ))}
        </div>
        <div className="relative mt-3 h-1 rounded-full bg-gray-100">
          <div className="absolute left-0 top-0 h-1 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
        </div>
      </div>

      {/* Step 1: Shop details */}
      {step === 0 && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold text-gray-900">Tell us about your shop</h3>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-900">Business name</label>
            <input type="text" value={shop.name} onChange={(e) => updateShop("name", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-900">What type of business?</label>
            <div className="flex gap-3">
              {[{ v: "barber", l: "Barber" }, { v: "hairdresser", l: "Hairdresser" }, { v: "both", l: "Both" }].map((o) => (
                <button key={o.v} type="button" onClick={() => updateShop("businessType", o.v)} className={`flex-1 ${optBtn(shop.businessType === o.v)}`}>{o.l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-900">Address line 1</label>
            <input type="text" value={shop.address1} onChange={(e) => updateShop("address1", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-900">Address line 2 (optional)</label>
            <input type="text" value={shop.address2} onChange={(e) => updateShop("address2", e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">City / Town</label>
              <input type="text" value={shop.city} onChange={(e) => updateShop("city", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">Postcode</label>
              <input type="text" value={shop.postcode} onChange={(e) => updateShop("postcode", e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">Phone</label>
              <input type="tel" value={shop.phone} onChange={(e) => updateShop("phone", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">Email</label>
              <input type="email" value={shop.email} onChange={(e) => updateShop("email", e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-900">WhatsApp number (optional)</label>
            <input type="tel" value={shop.whatsapp} onChange={(e) => updateShop("whatsapp", e.target.value)} placeholder="Same as phone if blank" className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-900">Describe your shop (optional)</label>
            <textarea value={shop.description} onChange={(e) => updateShop("description", e.target.value)} rows={3} placeholder="A few lines about your business, your style, what makes you different" className={`${inputClass} resize-y`} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">Instagram</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">@</span>
                <input type="text" value={shop.instagram} onChange={(e) => updateShop("instagram", e.target.value)} className={`${inputClass} pl-8`} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">Facebook</label>
              <input type="text" value={shop.facebook} onChange={(e) => updateShop("facebook", e.target.value)} placeholder="Page name or URL" className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">Google Maps</label>
              <input type="text" value={shop.googleMaps} onChange={(e) => updateShop("googleMaps", e.target.value)} placeholder="Paste your link" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-3 block text-sm font-semibold text-gray-900">Cancellation notice</label>
              <div className="flex flex-col gap-2">
                {[{ v: "none", l: "None" }, { v: "2h", l: "2 hours" }, { v: "12h", l: "12 hours" }, { v: "24h", l: "24 hours" }, { v: "48h", l: "48 hours" }].map((o) => (
                  <button key={o.v} type="button" onClick={() => updateShop("cancellationPolicy", o.v)} className={optBtn(shop.cancellationPolicy === o.v)}>{o.l}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-3 block text-sm font-semibold text-gray-900">No-show policy</label>
              <div className="flex flex-col gap-2">
                {[{ v: "none", l: "No action" }, { v: "flag", l: "Flag repeat offenders" }, { v: "charge", l: "Charge (future)" }].map((o) => (
                  <button key={o.v} type="button" onClick={() => updateShop("noShowPolicy", o.v)} className={optBtn(shop.noShowPolicy === o.v)}>{o.l}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-3 block text-sm font-semibold text-gray-900">Gap between bookings</label>
              <div className="flex flex-col gap-2">
                {[{ v: "0", l: "No gap" }, { v: "5", l: "5 min" }, { v: "10", l: "10 min" }, { v: "15", l: "15 min" }, { v: "30", l: "30 min" }].map((o) => (
                  <button key={o.v} type="button" onClick={() => updateShop("paddingMins", o.v)} className={optBtn(shop.paddingMins === o.v)}>{o.l}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Opening hours */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">When are you open?</h3>
          <p className="text-sm text-gray-500">Set your hours for each day. Toggle off any day you're closed.</p>
          {DAYS.map((day, i) => (
            <div key={day} className={`rounded-xl border p-4 transition-colors ${hours[i].isOpen ? "border-emerald-200 bg-emerald-50/50" : "border-gray-200 bg-gray-50"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">{day}</span>
                <button
                  type="button"
                  onClick={() => updateHours(i, "isOpen", !hours[i].isOpen)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${hours[i].isOpen ? "bg-emerald-500" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${hours[i].isOpen ? "translate-x-5" : ""}`} />
                </button>
              </div>
              {hours[i].isOpen && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <select value={hours[i].openTime} onChange={(e) => updateHours(i, "openTime", e.target.value)} className={`${selectClass} w-28`}>
                      {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="text-sm text-gray-400">to</span>
                    <select value={hours[i].closeTime} onChange={(e) => updateHours(i, "closeTime", e.target.value)} className={`${selectClass} w-28`}>
                      {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={hours[i].hasBreak} onChange={() => updateHours(i, "hasBreak", !hours[i].hasBreak)} className="h-4 w-4 rounded border-gray-300 text-emerald-500" />
                    Break during the day
                  </label>
                  {hours[i].hasBreak && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">Break:</span>
                      <select value={hours[i].breakStart} onChange={(e) => updateHours(i, "breakStart", e.target.value)} className={`${selectClass} w-28`}>
                        {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <span className="text-sm text-gray-400">to</span>
                      <select value={hours[i].breakEnd} onChange={(e) => updateHours(i, "breakEnd", e.target.value)} className={`${selectClass} w-28`}>
                        {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step 3: Staff */}
      {step === 2 && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-gray-900">Who works here?</h3>
          {staffList.map((s, idx) => (
            <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Staff member {idx + 1}</span>
                {staffList.length > 1 && (
                  <button type="button" onClick={() => setStaffList((prev) => prev.filter((_, i) => i !== idx))} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Name</label>
                  <input type="text" value={s.name} onChange={(e) => updateStaff(idx, "name", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Role</label>
                  <select value={s.role} onChange={(e) => updateStaff(idx, "role", e.target.value)} className={selectClass}>
                    <option value="barber">Barber</option>
                    <option value="stylist">Stylist</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone (optional)</label>
                <input type="tel" value={s.phone} onChange={(e) => updateStaff(idx, "phone", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Working days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day, dIdx) => (
                    <button key={day} type="button" onClick={() => toggleStaffDay(idx, dIdx)} className={dayBtn(s.days[dIdx])}>
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Start</label>
                  <select value={s.startTime} onChange={(e) => updateStaff(idx, "startTime", e.target.value)} className={`${selectClass} w-28`}>
                    {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <span className="mt-6 text-sm text-gray-400">to</span>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">End</label>
                  <select value={s.endTime} onChange={(e) => updateStaff(idx, "endTime", e.target.value)} className={`${selectClass} w-28`}>
                    {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setStaffList((prev) => [...prev, { name: "", role: "barber", phone: "", days: [true, true, true, true, true, false, false], startTime: "09:00", endTime: "18:00" }])} className="w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-400 transition-colors hover:border-emerald-400 hover:text-emerald-600">
            + Add another staff member
          </button>
        </div>
      )}

      {/* Step 4: Services */}
      {step === 3 && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-gray-900">What services do you offer?</h3>
          {serviceList.map((svc, idx) => (
            <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-700">Service {idx + 1}</span>
                {serviceList.length > 1 && (
                  <button type="button" onClick={() => setServiceList((prev) => prev.filter((_, i) => i !== idx))} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3 sm:col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Service name</label>
                  <input type="text" value={svc.name} onChange={(e) => updateService(idx, "name", e.target.value)} placeholder="e.g. Skin Fade" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Duration</label>
                  <select value={svc.durationMins} onChange={(e) => updateService(idx, "durationMins", parseInt(e.target.value))} className={selectClass}>
                    {[15, 20, 30, 45, 60, 75, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">£</span>
                    <input type="number" step="0.50" min="0" value={svc.pricePounds} onChange={(e) => updateService(idx, "pricePounds", e.target.value)} placeholder="15" className={`${inputClass} pl-7`} />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setServiceList((prev) => [...prev, { name: "", durationMins: 30, pricePounds: "" }])} className="w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-400 transition-colors hover:border-emerald-400 hover:text-emerald-600">
            + Add another service
          </button>
        </div>
      )}

      {/* Step 5: Pricing rules */}
      {step === 4 && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-gray-900">Pricing rules (optional)</h3>
          <p className="text-sm text-gray-500">Set discounts for quiet times or surcharges for busy periods. You can skip this and add them later.</p>
          {rules.map((rule, idx) => (
            <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Rule {idx + 1}</span>
                <button type="button" onClick={() => setRules((prev) => prev.filter((_, i) => i !== idx))} className="text-xs text-red-400 hover:text-red-600">Remove</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Rule name</label>
                  <input type="text" value={rule.name} onChange={(e) => updateRule(idx, "name", e.target.value)} placeholder="e.g. Early bird, Late night" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Type</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateRule(idx, "ruleType", "discount")} className={`flex-1 ${optBtn(rule.ruleType === "discount")}`}>Discount</button>
                    <button type="button" onClick={() => updateRule(idx, "ruleType", "surcharge")} className={`flex-1 ${optBtn(rule.ruleType === "surcharge")}`}>Surcharge</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Amount type</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateRule(idx, "amountType", "percentage")} className={`flex-1 ${optBtn(rule.amountType === "percentage")}`}>%</button>
                    <button type="button" onClick={() => updateRule(idx, "amountType", "fixed")} className={`flex-1 ${optBtn(rule.amountType === "fixed")}`}>Fixed £</button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{rule.amountType === "percentage" ? "%" : "£"}</span>
                    <input type="number" min="0" value={rule.amount} onChange={(e) => updateRule(idx, "amount", e.target.value)} placeholder={rule.amountType === "percentage" ? "20" : "3"} className={`${inputClass} pl-7`} />
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Which days?</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day, dIdx) => (
                    <button key={day} type="button" onClick={() => toggleRuleDay(idx, dIdx)} className={dayBtn(rule.days[dIdx])}>{day.slice(0, 3)}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">From</label>
                  <select value={rule.timeStart} onChange={(e) => updateRule(idx, "timeStart", e.target.value)} className={`${selectClass} w-28`}>
                    <option value="">Any</option>
                    {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <span className="mt-6 text-sm text-gray-400">to</span>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Until</label>
                  <select value={rule.timeEnd} onChange={(e) => updateRule(idx, "timeEnd", e.target.value)} className={`${selectClass} w-28`}>
                    <option value="">Any</option>
                    {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setRules((prev) => [...prev, { name: "", ruleType: "discount", amountType: "percentage", amount: "", days: [true, true, true, true, true, true, true], timeStart: "", timeEnd: "" }])} className="w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-400 transition-colors hover:border-emerald-400 hover:text-emerald-600">
            + Add a pricing rule
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-10 flex items-center justify-between">
        {step > 0 ? (
          <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            Back
          </button>
        ) : <div />}
        {step < STEPS.length - 1 ? (
          <button onClick={() => canProceed() && setStep(step + 1)} disabled={!canProceed()} className="rounded-lg bg-emerald-500 px-8 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-600 disabled:opacity-40">Continue</button>
        ) : (
          <button onClick={handleSubmit} disabled={loading} className="rounded-lg bg-emerald-500 px-8 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-600 disabled:opacity-40">
            {loading ? "Setting up..." : "Complete Setup"}
          </button>
        )}
      </div>
    </div>
  );
}
