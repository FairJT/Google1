import React, { useState } from "react";
import { User, Skill, HiringOffer, ClientRequest } from "../types";
import { Search, MapPin, Briefcase, Star, Filter, Send, Calendar, Clock, DollarSign, Sparkles, Check, ChevronDown, Award, Scale } from "lucide-react";
import { toPersianDigits, formatToman, isShamsiWeekend, getCurrentJalaliDateString } from "../utils/shamsi";
import ArtistComparisonView from "./ArtistComparisonView";
import PersianDatePicker from "./PersianDatePicker";

const TIME_SLOTS = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00", "19:30"];

interface HiringMarketplaceProps {
  currentUser: User;
  allUsers: User[];
  onUpdateUsers: (users: User[]) => void;
  hiringOffers: HiringOffer[];
  onAddHiringOffer: (offer: HiringOffer) => void;
  clientRequests: ClientRequest[];
  onAddClientRequest: (request: ClientRequest) => void;
}

const CITIES = ["همه شهرهای ایران", "تهران", "اصفهان", "شیراز", "مشهد"];

export default function HiringMarketplace({
  currentUser,
  allUsers,
  onUpdateUsers,
  hiringOffers,
  onAddHiringOffer,
  clientRequests,
  onAddClientRequest
}: HiringMarketplaceProps) {
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("همه شهرهای ایران");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [onlyAvailableForHiring, setOnlyAvailableForHiring] = useState(false);
  
  // Tab control and preselection for Comparison View
  const [activeTab, setActiveTab] = useState<"list" | "compare">("list");
  const [compareArtistAId, setCompareArtistAId] = useState<string>("");
  const [compareArtistBId, setCompareArtistBId] = useState<string>("");
  
  // Modals state
  const [selectedArtistForOffer, setSelectedArtistForOffer] = useState<User | null>(null);
  const [offerMessage, setOfferMessage] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  
  const [selectedTargetForClientRequest, setSelectedTargetForClientRequest] = useState<User | null>(null);
  const [serviceType, setServiceType] = useState("");
  const [preferredDate, setPreferredDate] = useState(() => getCurrentJalaliDateString());
  const [preferredTime, setPreferredTime] = useState("09:00");
  const [requestNote, setRequestNote] = useState("");

  // Helper to calculate profile strength
  const calculateProfileStrength = (user: User): number => {
    let score = 20; // base score for name and role
    if (user.avatar && !user.avatar.includes("default")) score += 15;
    if (user.bio && user.bio.length > 10) score += 15;
    if (user.skills && user.skills.length > 0) score += 15;
    if (user.portfolio && user.portfolio.length >= 3) score += 15;
    if (user.certifications && user.certifications.length > 0) score += 10;
    if (user.phone) score += 10;
    return Math.min(score, 100);
  };

  // Get active gamified badges based on ratings & experience & strength
  const getArtistBadges = (user: User) => {
    const badges: { label: string; color: string; desc: string }[] = [];
    const strength = calculateProfileStrength(user);
    
    if (user.rating && user.rating >= 4.9) {
      badges.push({ 
        label: "برترین امتیاز", 
        color: "bg-amber-50 text-amber-800 border-amber-200",
        desc: "میانگین رضایت بالای ۴.۹" 
      });
    }
    if (user.yearsOfExperience && user.yearsOfExperience >= 7) {
      badges.push({ 
        label: "تأییدشده", 
        color: "bg-indigo-50 text-indigo-800 border-indigo-200", 
        desc: "بیش از ۷ سال سابقه ممیزی شده" 
      });
    } else if (strength >= 80) {
      badges.push({ 
        label: "استعداد نوظهور", 
        color: "bg-emerald-50 text-emerald-800 border-emerald-200",
        desc: "پروفایل فوق‌العاده با پتانسیل بالا" 
      });
    }
    return badges;
  };

  // Fetch all unique skills from seed data for filter list
  const allSkills = Array.from(
    new Set(
      allUsers
        .filter(u => u.role === "artist")
        .flatMap(u => u.skills || [])
        .map(s => s.name)
    )
  );

  // List of salons & managers who are Open for Hiring
  const openSalons = allUsers.filter(u => u.role === "manager" && u.openForHiring);

  // Filter and Rank artists
  // "artists with higher profile strength + higher ratings rank higher in search results — this is the 'race for hiring.' Make ranking visible."
  const rankedArtists = allUsers
    .filter(u => u.role === "artist")
    .map(u => {
      const strength = calculateProfileStrength(u);
      const rating = u.rating || 4.0;
      // Formula for ranking score: strength * 0.6 + rating * 20 * 0.4
      const rankingScore = strength * 0.6 + rating * 20 * 0.4;
      return { ...u, strength, rankingScore };
    })
    // Apply filters
    .filter(u => {
      const matchSearch = u.name.includes(searchTerm) || u.title.includes(searchTerm) || u.bio.includes(searchTerm);
      const matchCity = selectedCity === "همه شهرهای ایران" || u.city === selectedCity;
      const matchSkill = !selectedSkill || (u.skills && u.skills.some(s => s.name === selectedSkill));
      const matchHiring = !onlyAvailableForHiring || u.openForHiring;
      return matchSearch && matchCity && matchSkill && matchHiring;
    })
    // Sort descending by rankingScore
    .sort((a, b) => b.rankingScore - a.rankingScore);

  const handleSendHiringOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.id === "guest") {
      alert("کاربر گرامی، برای ارسال پیشنهاد همکاری ابتدا باید وارد حساب کاربری خود شوید یا ثبت‌نام کنید.");
      return;
    }
    if (!selectedArtistForOffer) return;

    const offer: HiringOffer = {
      id: "offer-" + Math.random().toString(36).substr(2, 9),
      managerId: currentUser.id,
      managerName: currentUser.name,
      salonName: currentUser.salonName || "سالن تحت مدیریت شما",
      artistId: selectedArtistForOffer.id,
      artistName: selectedArtistForOffer.name,
      message: offerMessage,
      offerAmount: offerAmount || undefined,
      status: "pending",
      createdAt: "1405/04/10" // Shamsi current simulation date
    };

    onAddHiringOffer(offer);
    setOfferMessage("");
    setOfferAmount("");
    setSelectedArtistForOffer(null);
    alert(`پیشنهاد همکاری شما با موفقیت برای ${selectedArtistForOffer.name} ارسال شد.`);
  };

  const handleSendClientRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.id === "guest") {
      alert("کاربر گرامی، برای ثبت نوبت و درخواست خدمات زیبایی ابتدا باید وارد حساب کاربری خود شوید یا ثبت‌نام کنید.");
      return;
    }
    if (!selectedTargetForClientRequest) return;

    const request: ClientRequest = {
      id: "req-" + Math.random().toString(36).substr(2, 9),
      clientId: currentUser.id,
      clientName: currentUser.name,
      clientPhone: currentUser.phone || "۰۹۱۲۰۰۰۰۰۰۰",
      targetId: selectedTargetForClientRequest.id,
      targetName: selectedTargetForClientRequest.role === "manager" ? (selectedTargetForClientRequest.salonName || selectedTargetForClientRequest.name) : selectedTargetForClientRequest.name,
      targetType: selectedTargetForClientRequest.role === "manager" ? "salon" : "artist",
      serviceType: serviceType,
      preferredDate: preferredDate,
      preferredTime: preferredTime,
      note: requestNote,
      status: "pending",
      createdAt: getCurrentJalaliDateString()
    };

    onAddClientRequest(request);
    setServiceType("");
    setRequestNote("");
    setSelectedTargetForClientRequest(null);
    alert(`درخواست نوبت شما با موفقیت برای ${request.targetName} ارسال شد و در صندوق ورودی ایشان ثبت گردید.`);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Segment Tab Controls */}
      {currentUser.role === "manager" && (
        <div className="flex border border-slate-150 bg-slate-50/50 p-1.5 rounded-2xl gap-1.5 w-fit">
          <button
            onClick={() => setActiveTab("list")}
            className={`text-center px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "list"
                ? "bg-[#0284c7] text-white shadow-xs font-extrabold"
                : "text-slate-500 hover:text-slate-800 hover:bg-white"
            }`}
          >
            لیست و دایرکتوری هنرمندان
          </button>
          <button
            onClick={() => setActiveTab("compare")}
            className={`text-center px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "compare"
                ? "bg-[#0284c7] text-white shadow-xs font-extrabold"
                : "text-slate-500 hover:text-slate-800 hover:bg-white"
            }`}
          >
            <Scale className="w-4 h-4" />
            میز مقایسه جانبی (D3 Graph)
          </button>
        </div>
      )}

      {activeTab === "compare" ? (
        <ArtistComparisonView
          currentUser={currentUser}
          artists={allUsers.filter((u) => u.role === "artist")}
          calculateProfileStrength={calculateProfileStrength}
          onSendHiringOffer={setSelectedArtistForOffer}
          initialArtistAId={compareArtistAId}
          initialArtistBId={compareArtistBId}
        />
      ) : (
        <>
          {/* Search Header */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-[#0284c7]" />
          <div>
            <h2 className="text-base font-bold text-slate-950">بازار کار و مأموریت استخدامی کشور</h2>
            <p className="text-[11px] text-slate-500">پروفایل‌های ممیزی شده پرسنل را مرور کنید، قدرت رزومه‌ها را ببینید و استخدام هوشمند را آغاز کنید.</p>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {/* Text Search */}
          <div className="relative flex items-center bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5">
            <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
            <input
              type="text"
              placeholder="جستجو بر اساس نام یا تخصص..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder-slate-400"
            />
          </div>

          {/* City Selector */}
          <div className="relative flex items-center bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5">
            <MapPin className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-700 outline-none cursor-pointer font-bold"
            >
              {CITIES.map((city, i) => (
                <option key={i} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Skill Selector */}
          <div className="relative flex items-center bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5">
            <Briefcase className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-700 outline-none cursor-pointer font-bold"
            >
              <option value="">همه تخصص‌ها</option>
              {allSkills.map((skill, i) => (
                <option key={i} value={skill as string}>{skill as string}</option>
              ))}
            </select>
          </div>

          {/* Checkbox for Available for Hiring */}
          <label className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-slate-100/50 transition-all">
            <input
              type="checkbox"
              checked={onlyAvailableForHiring}
              onChange={(e) => setOnlyAvailableForHiring(e.target.checked)}
              className="w-4 h-4 rounded accent-[#0284c7]"
            />
            <span className="text-xs text-slate-600 font-bold">فقط افراد آماده به کار (Open for Hiring)</span>
          </label>
        </div>
      </div>

      {/* Salons Open for Hiring Quick Banner */}
      {openSalons.length > 0 && (
        <div className="bg-[#FAF8F4] border border-[#0284c7]/20 rounded-2xl p-4.5">
          <h3 className="text-xs font-bold text-[#0284c7] flex items-center gap-1.5 mb-3">
            <Award className="w-4 h-4" />
            سالن‌های فعال در جذب نیرو (در حال استخدام):
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {openSalons.map((salon) => (
              <div key={salon.id} className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{salon.salonName}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 shrink-0" /> {salon.city}
                  </p>
                </div>
                {currentUser.role === "client" && salon.acceptingRequests && (
                  <button
                    onClick={() => setSelectedTargetForClientRequest(salon)}
                    className="bg-[#0284c7] hover:bg-[#0369a1] text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                  >
                    رزرو نوبت
                  </button>
                )}
                {currentUser.role === "artist" && (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    جذب نیرو فعال
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Directory Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
          <span>لیست هنرمندان بر اساس امتیاز و قدرت رزومه</span>
          <span className="bg-[#0284c7]/10 text-[#0284c7] text-xs px-2.5 py-0.5 rounded-full font-bold">
            {toPersianDigits(rankedArtists.length)} مورد
          </span>
        </h3>
        <p className="text-[10px] text-slate-400 font-bold">نمایش بر اساس رتبه رقابت استخدام</p>
      </div>

      {/* Artists Directory Grid */}
      <div className="grid md:grid-cols-2 gap-5">
        {rankedArtists.length > 0 ? (
          rankedArtists.map((artist, index) => {
            const badges = getArtistBadges(artist);
            const strengthColor = artist.strength >= 80 ? "bg-emerald-500" : artist.strength >= 50 ? "bg-amber-500" : "bg-slate-400";

            return (
              <div 
                key={artist.id} 
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between relative group overflow-hidden"
              >
                {/* Ranking Ribbon Badge */}
                <div className="absolute top-0 left-0 bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded-br-xl flex items-center gap-1 z-10">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  رتبه {toPersianDigits(index + 1)}
                </div>

                <div className="space-y-4">
                  {/* Top Header */}
                  <div className="flex gap-3.5 pt-3">
                    <img
                      src={artist.avatar}
                      alt={artist.name}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-150 shadow-2xs shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0284c7] transition-all">{artist.name}</h4>
                        {artist.openForHiring ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-bold px-2 py-0.5 rounded-full">
                            آماده به کار
                          </span>
                        ) : (
                          <span className="bg-slate-50 text-slate-500 border border-slate-100 text-[8px] font-bold px-2 py-0.5 rounded-full">
                            مشغول به کار
                          </span>
                        )}
                      </div>
                      
                      <p className="text-[11px] text-slate-600 font-medium leading-tight">{artist.title}</p>
                      
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold">
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 shrink-0" /> {artist.city}
                        </span>
                        <span className="flex items-center gap-0.5 text-amber-600">
                          <Star className="w-3 h-3 fill-amber-400 stroke-amber-400 shrink-0" /> {toPersianDigits(artist.rating || 4.5)}
                        </span>
                        <span>
                          {toPersianDigits(artist.yearsOfExperience || 1)} سال سابقه
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Profile Strength Meter */}
                  <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 border border-slate-100">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-bold">قدرت و اعتبار رزومه:</span>
                      <span className="text-slate-800 font-extrabold">{toPersianDigits(artist.strength)}٪</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${strengthColor} transition-all duration-500`}
                        style={{ width: `${artist.strength}%` }}
                      />
                    </div>
                  </div>

                  {/* Badges Chips */}
                  {badges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {badges.map((badge, bIdx) => (
                        <span 
                          key={bIdx} 
                          title={badge.desc}
                          className={`text-[8.5px] font-bold px-2 py-0.5 rounded-md border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Specialties Chips */}
                  {artist.skills && artist.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {artist.skills.map((skill, sIdx) => (
                        <span key={sIdx} className="bg-slate-50 border border-slate-150 text-slate-600 text-[9px] px-2 py-0.5 rounded">
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Portfolio Gallery preview (first 3 items) */}
                  {artist.portfolio && artist.portfolio.length > 0 && (
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {artist.portfolio.slice(0, 3).map((item) => (
                        <div key={item.id} className="aspect-square rounded-lg overflow-hidden border border-slate-100" title={item.title}>
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Action Bar */}
                <div className="border-t border-slate-100 pt-3.5 mt-4 flex items-center justify-between gap-2">
                  <span className="text-[9px] text-slate-400 font-bold">
                    {artist.acceptingRequests ? "⚡ پذیرش درخواست فعال" : "🔒 عدم پذیرش موقت"}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Send client request */}
                    {currentUser.role === "client" && artist.acceptingRequests && (
                      <button
                        onClick={() => setSelectedTargetForClientRequest(artist)}
                        className="bg-[#0284c7] hover:bg-[#0369a1] text-white text-[10px] font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        ارسال درخواست نوبت
                      </button>
                    )}

                    {/* Send Manager Hiring Offer & Compare */}
                    {currentUser.role === "manager" && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setCompareArtistAId(artist.id);
                            const otherArtist = allUsers.find(u => u.role === "artist" && u.id !== artist.id);
                            if (otherArtist) {
                              setCompareArtistBId(otherArtist.id);
                            }
                            setActiveTab("compare");
                          }}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Scale className="w-3.5 h-3.5 text-[#0284c7]" />
                          مقایسه آرتیست
                        </button>
                        
                        <button
                          onClick={() => setSelectedArtistForOffer(artist)}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          ارسال پیشنهاد همکاری
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        ) : (
          <div className="col-span-2 text-center p-8 bg-white border border-slate-100 rounded-2xl">
            <p className="text-xs text-slate-400 font-bold">هیچ هنرمندی یافت نشد که مطابق با معیارهای فیلتر شما باشد.</p>
          </div>
        )}
      </div>
    </>
  )}

      {/* --- MODAL 1: SEND HIRING OFFER (Manager -> Artist) --- */}
      {selectedArtistForOffer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 shadow-xl text-right">
            <h3 className="text-sm font-bold text-slate-900">ارسال پیشنهاد استخدام و جذب نیرو</h3>
            <p className="text-xs text-slate-500">
              شما در حال ارسال آگهی اختصاصی همکاری برای <strong>{selectedArtistForOffer.name}</strong> هستید. این پیشنهاد مستقیماً در کارتابل ایشان نمایش داده خواهد شد.
            </p>

            <form onSubmit={handleSendHiringOffer} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">نام سالن شما:</label>
                <input
                  type="text"
                  readOnly
                  value={currentUser.salonName || "خانه زیبایی لجند"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">حقوق پیشنهادی یا پورسانت تخمینی (اختیاری):</label>
                <input
                  type="text"
                  placeholder="مثال: ۱۵,۰۰۰,۰۰۰ تومان ثابت + ۳۰ درصد پورسانت"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 outline-none focus:border-olive-300"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">پیام همکاری و توصیفات مسئولیت‌ها:</label>
                <textarea
                  required
                  placeholder="مثال: سلام، آلبوم کارهای ناخن شما رو دیدم و فوق‌العاده پسندیدم. برای راه‌اندازی لاین ژل جدید سالن خودمون تمایل داریم به طور تمام وقت با شما همکاری کنیم..."
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  rows={4}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 outline-none focus:border-olive-300 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                >
                  ارسال آگهی و پیشنهاد
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedArtistForOffer(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: SEND CLIENT REQUEST (Client -> Artist/Salon) --- */}
      {selectedTargetForClientRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-5 border border-slate-100 shadow-2xl text-right my-8 max-h-[95vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <img
                src={selectedTargetForClientRequest.avatar}
                alt={selectedTargetForClientRequest.name}
                className="w-12 h-12 rounded-full object-cover border border-slate-200"
              />
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-slate-900">رزرو نوبت خدمات زیبایی</h3>
                <p className="text-[11px] text-slate-500">
                  در حال ثبت درخواست نوبت برای <strong className="text-[#0284c7]">{selectedTargetForClientRequest.role === "manager" ? (selectedTargetForClientRequest.salonName || selectedTargetForClientRequest.name) : selectedTargetForClientRequest.name}</strong> ({selectedTargetForClientRequest.title})
                </p>
              </div>
            </div>

            <form onSubmit={handleSendClientRequest} className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                
                {/* RIGHT COLUMN: CALENDAR & WEEKEND CHECK */}
                <div className="space-y-3.5 bg-slate-50/60 border border-slate-200/50 p-4 rounded-2xl">
                  <span className="block text-[11px] text-slate-500 font-black mb-1">۱. تاریخ حضور مورد نظر را روی تقویم انتخاب کنید:</span>
                  
                  {/* Interactive Shamsi Calendar Picker */}
                  <PersianDatePicker
                    value={preferredDate}
                    onChange={(newDate) => setPreferredDate(newDate)}
                  />

                  {/* Weekend Check Badge */}
                  {(() => {
                    const parts = preferredDate.split("/");
                    const isW = parts.length === 3 ? isShamsiWeekend(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2])) : false;
                    return isW ? (
                      <div className="bg-amber-50 text-amber-800 border border-amber-200/60 text-[10px] font-bold p-3 rounded-xl leading-relaxed flex items-start gap-1.5 animate-fade-in">
                        <span>⚠️</span>
                        <span>توجه: روز انتخابی شما آخر هفته (پنج‌شنبه یا جمعه) است. تایید نهایی نوبت منوط به پذیرش آرتیست زیبایی خواهد بود.</span>
                      </div>
                    ) : (
                      <div className="bg-[#0284c7]/5 text-[#0284c7] border border-[#0284c7]/15 text-[10px] font-bold p-3 rounded-xl leading-relaxed flex items-start gap-1.5">
                        <span>📅</span>
                        <span>نوبت شما برای روز غیرتعطیل ثبت می‌شود. شانس پذیرش سریع‌تر درخواست بیشتر است.</span>
                      </div>
                    );
                  })()}
                </div>

                {/* LEFT COLUMN: SERVICE LINE, PRESETS, SLOTS & NOTES */}
                <div className="space-y-4">
                  
                  {/* Service Input and Preset Pills */}
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 font-black mb-1">۲. خدمات زیبایی مورد نیاز:</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: لایت عسلی، کاشت مژه، میکاپ ویژه"
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-[#0284c7] focus:border-[#0284c7] transition-all font-bold"
                      />
                    </div>

                    {/* Pre-fill pill options based on artist's real skills */}
                    {selectedTargetForClientRequest.skills && selectedTargetForClientRequest.skills.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="block text-[9px] text-slate-400 font-bold">تخصص‌های آرتیست (برای انتخاب سریع کلیک کنید):</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedTargetForClientRequest.skills.map((skill, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setServiceType(skill.name)}
                              className="text-[9.5px] bg-white hover:bg-[#0284c7] hover:text-white border border-slate-200 text-slate-600 font-bold px-2 py-1 rounded-lg transition-all cursor-pointer shadow-2xs"
                            >
                              {skill.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Time Slot Selection Grid with Clash Prevention */}
                  <div className="space-y-2">
                    <label className="block text-[11px] text-slate-500 font-black mb-1">۳. ساعت حضور پیشنهادی را انتخاب کنید:</label>
                    
                    <div className="grid grid-cols-4 gap-2">
                      {TIME_SLOTS.map((slot) => {
                        const isSlotBooked = clientRequests.some(
                          r => r.targetId === selectedTargetForClientRequest.id &&
                               r.preferredDate === preferredDate &&
                               r.preferredTime === slot &&
                               r.status !== "declined"
                        );
                        
                        const isSelected = preferredTime === slot;

                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={isSlotBooked}
                            onClick={() => setPreferredTime(slot)}
                            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                              isSlotBooked
                                ? "bg-rose-50 text-rose-400 border border-rose-100/70 cursor-not-allowed opacity-60 line-through"
                                : isSelected
                                ? "bg-[#0284c7] text-white shadow-md shadow-[#0284c7]/20 border border-[#0284c7]"
                                : "bg-white border border-slate-200 text-slate-700 hover:border-[#0284c7] hover:bg-[#0284c7]/5"
                            }`}
                          >
                            <span>{toPersianDigits(slot)}</span>
                            {isSlotBooked && <span className="text-[7.5px] text-rose-500 font-black mt-0.5">رزرو شده</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detailed Notes text area */}
                  <div>
                    <label className="block text-[11px] text-slate-500 font-black mb-1">۴. توضیحات تکمیلی یا شرایط مو/ناخن:</label>
                    <textarea
                      placeholder="قد مو، سابقه رنگ تیره یا کراتین، حساسیت‌ها یا هر توضیحی که به هماهنگی بهتر آرتیست کمک می‌کند..."
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                      rows={2}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-[#0284c7] focus:border-[#0284c7] transition-all resize-none font-medium"
                    />
                  </div>

                </div>

              </div>

              {/* Action Buttons Footer */}
              <div className="flex gap-3 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-black py-3 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>ثبت نهایی درخواست نوبت</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTargetForClientRequest(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-3 rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  انصراف و بستن
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
