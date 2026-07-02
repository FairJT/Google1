import React, { useState, useMemo } from "react";
import { User, Transaction, LeaveRequest, ClientRequest, Service, StaffContract } from "../types";
import { toPersianDigits, formatToman } from "../utils/shamsi";
import { calculateEmployeeBalance } from "../utils/employeeBalance";
import { seedServices } from "../data";
import { 
  Users, UserPlus, Briefcase, DollarSign, Calendar, ShieldAlert,
  Check, X, FileText, Settings, Sparkles, Phone, Mail, Award,
  Clock, Plus, Trash2, Edit2, CheckCircle2, ChevronDown, ListFilter, TrendingUp, RefreshCw
} from "lucide-react";

interface StaffManagementProps {
  currentUser: User;
  allUsers: User[];
  onUpdateUsers: (updatedList: User[]) => void;
  transactions: Transaction[];
  onUpdateTransactions: (updatedList: Transaction[]) => void;
  leaveRequests: LeaveRequest[];
  onUpdateLeaveRequests: (updatedList: LeaveRequest[]) => void;
  clientRequests: ClientRequest[];
}

export default function StaffManagement({
  currentUser,
  allUsers,
  onUpdateUsers,
  transactions,
  onUpdateTransactions,
  leaveRequests,
  onUpdateLeaveRequests,
  clientRequests
}: StaffManagementProps) {
  // Local state managers
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterRole, setFilterRole] = useState<"all" | "artist" | "service-staff">("all");
  const [filterContract, setFilterContract] = useState<"all" | "درصدی" | "اجاره‌ای" | "حقوق ثابت">("all");

  // Form State for creating new staff
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffTitle, setNewStaffTitle] = useState("");
  const [newStaffBio, setNewStaffBio] = useState("");
  const [newStaffExp, setNewStaffExp] = useState(3);
  const [newStaffRole, setNewStaffRole] = useState<"artist" | "service-staff">("artist");
  const [contractType, setContractType] = useState<"درصدی" | "اجاره‌ای" | "حقوق ثابت">("درصدی");
  const [contractAmount, setContractAmount] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Modals / Dialog States
  const [paymentStaff, setPaymentStaff] = useState<User | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDesc, setPaymentDesc] = useState("");

  const [leaveStaff, setLeaveStaff] = useState<User | null>(null);
  const [leaveStart, setLeaveStart] = useState("1405/04/20");
  const [leaveEnd, setLeaveEnd] = useState("1405/04/22");
  const [leaveNote, setLeaveNote] = useState("");

  const [serviceStaff, setServiceStaff] = useState<User | null>(null);
  const [serviceChecklist, setServiceChecklist] = useState<string[]>([]);

  // Get only the bookable services (child items) from seedServices
  const bookableServices = useMemo(() => {
    return seedServices.filter(s => s.parentServiceId !== undefined);
  }, []);

  // Filter staff belonging to this manager's salon
  const salonStaff = useMemo(() => {
    const managerSalonName = currentUser.salonName || "خانه زیبایی لجند";
    return allUsers.filter(u => {
      // Must be an artist or service-staff
      const isStaffRole = u.role === "artist" || u.role === "service-staff";
      if (!isStaffRole) return false;

      // Associate if salonName matches, or they have a contract with this salon
      const isMine = u.salonName === managerSalonName || u.salonName?.includes(managerSalonName) || u.contract !== undefined;
      return isMine;
    });
  }, [allUsers, currentUser.salonName]);

  // Apply filters
  const filteredStaff = useMemo(() => {
    return salonStaff.filter(s => {
      const matchRole = filterRole === "all" || s.role === filterRole;
      const matchContract = filterContract === "all" || s.contract?.contractType === filterContract;
      return matchRole && matchContract;
    });
  }, [salonStaff, filterRole, filterContract]);

  // Staff Statistics summary
  const staffStats = useMemo(() => {
    const total = salonStaff.length;
    const fixed = salonStaff.filter(s => s.contract?.contractType === "حقوق ثابت").length;
    const commission = salonStaff.filter(s => s.contract?.contractType === "درصدی").length;
    const rental = salonStaff.filter(s => s.contract?.contractType === "اجاره‌ای").length;

    // Find top earning employee based on generated income
    let topEarner: { name: string; amount: number } | null = null;
    salonStaff.forEach(s => {
      const balanceSummary = calculateEmployeeBalance(s, transactions);
      if (!topEarner || balanceSummary.totalGeneratedIncome > topEarner.amount) {
        topEarner = { name: s.name, amount: balanceSummary.totalGeneratedIncome };
      }
    });

    return { total, fixed, commission, rental, topEarner };
  }, [salonStaff, transactions]);

  // Handle adding new artist/staff
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffPhone.trim() || !newStaffTitle.trim()) {
      alert("لطفاً اطلاعات اجباری (نام، شماره تماس و تخصص) را وارد کنید.");
      return;
    }

    // Create a mock contract object
    const newContract: StaffContract = {
      contractType,
      startDate: "1405/04/01",
      amount: contractAmount.trim() || (contractType === "درصدی" ? "۴۰٪" : "۱۰,۰۰۰,۰۰۰ تومان")
    };

    // Create a random profile avatar
    const randomAvatars = [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop"
    ];
    const avatar = randomAvatars[Math.floor(Math.random() * randomAvatars.length)];

    const newStaffUser: User = {
      id: "staff-" + Math.random().toString(36).substring(2, 9),
      name: newStaffName,
      phone: newStaffPhone,
      email: newStaffEmail || `${newStaffName.replace(/\s+/g, "").toLowerCase()}@legendin.ir`,
      role: newStaffRole,
      avatar,
      title: newStaffTitle,
      city: currentUser.city || "تهران",
      bio: newStaffBio || `همکار متخصص و مجرب در لاین زیبایی ${newStaffTitle}`,
      yearsOfExperience: Number(newStaffExp),
      salonName: currentUser.salonName || "خانه زیبایی لجند",
      openForHiring: false,
      acceptingRequests: true,
      assignedServiceIds: selectedServices,
      contract: newContract
    };

    onUpdateUsers([newStaffUser, ...allUsers]);

    // Reset Form Fields
    setNewStaffName("");
    setNewStaffPhone("");
    setNewStaffEmail("");
    setNewStaffTitle("");
    setNewStaffBio("");
    setNewStaffExp(3);
    setNewStaffRole("artist");
    setContractType("درصدی");
    setContractAmount("");
    setSelectedServices([]);
    setShowAddForm(false);

    alert(`پرسنل جدید (${newStaffName}) با موفقیت تعریف شد و قرارداد همکاری ثبت گردید! ✨`);
  };

  // Handle payouts / settlements
  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentStaff) return;
    const amountNum = parseInt(paymentAmount.replace(/[^\d]/g, ""), 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("لطفاً مبلغ معتبری برای تسویه حساب وارد کنید.");
      return;
    }

    const newTx: Transaction = {
      id: `tx-payout-${Date.now()}`,
      salonId: "salon-1",
      direction: "cost",
      category: "حقوق پرسنل",
      amount: amountNum,
      date: "1405/04/12",
      description: paymentDesc.trim() || `تسویه حساب ماهانه با ${paymentStaff.name} بابت کارکرد لاین زیبایی`,
      relatedStaffId: paymentStaff.id,
      createdAt: new Date().toISOString()
    };

    onUpdateTransactions([newTx, ...transactions]);
    setPaymentStaff(null);
    setPaymentAmount("");
    setPaymentDesc("");
    alert(`تراکنش مالی تسویه حساب به مبلغ ${formatToman(amountNum)} تومان برای (${paymentStaff.name}) با موفقیت ثبت شد. 💳`);
  };

  // Handle direct leave recording
  const handleAddLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStaff) return;

    const newLeave: LeaveRequest = {
      id: `leave-${Date.now()}`,
      staffId: leaveStaff.id,
      startDate: leaveStart,
      endDate: leaveEnd,
      requiresApproval: leaveStaff.contract?.contractType === "حقوق ثابت",
      status: leaveStaff.contract?.contractType === "حقوق ثابت" ? "accepted" : "logged",
      note: leaveNote.trim() || "ثبت مرخصی توسط مدیریت سالن"
    };

    onUpdateLeaveRequests([newLeave, ...leaveRequests]);
    setLeaveStaff(null);
    setLeaveNote("");
    alert(`مرخصی پرسنل (${leaveStaff.name}) در تقویم کاری سالن با موفقیت ثبت شد. 📅`);
  };

  // Save modified assigned services
  const handleSaveServices = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceStaff) return;

    const updatedUsers = allUsers.map(u => {
      if (u.id === serviceStaff.id) {
        return {
          ...u,
          assignedServiceIds: serviceChecklist
        };
      }
      return u;
    });

    onUpdateUsers(updatedUsers);
    setServiceStaff(null);
    setServiceChecklist([]);
    alert(`لاین‌های خدماتی تخصیص داده شده به (${serviceStaff.name}) با موفقیت به‌روزرسانی شد. ✂️`);
  };

  // Handle termination of collaboration
  const handleTerminateContract = (staff: User) => {
    if (confirm(`آیا از پایان دادن به قرارداد همکاری با (${staff.name}) و لغو دسترسی‌های سالنی وی اطمینان دارید؟`)) {
      const updatedUsers = allUsers.map(u => {
        if (u.id === staff.id) {
          // Remove contract and association
          const { contract, salonName, ...rest } = u;
          return {
            ...rest,
            role: "artist" as const, // keep as default artist without salon
            openForHiring: true // open back up to the market
          };
        }
        return u;
      });
      onUpdateUsers(updatedUsers);
      alert(`قرارداد همکاری با (${staff.name}) خاتمه یافت و پرونده پرسنلی وی آرشیو شد.`);
    }
  };

  // Toggle bookable service checklist
  const toggleServiceInChecklist = (serviceId: string) => {
    setServiceChecklist(prev => 
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  return (
    <div className="space-y-6 text-right animate-fade-in" dir="rtl">
      
      {/* 1. Header Banner & Dynamic Stats Bento */}
      <div className="bg-gradient-to-l from-[#0284c7] to-[#0369a1] rounded-2xl p-5 text-white shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="space-y-1">
            <h2 className="text-base font-black flex items-center gap-2">
              <Users className="w-5 h-5" />
              مدیریت و مانیتورینگ پرسنل سالن
            </h2>
            <p className="text-[10.5px] text-white/80">
              تعریف پرسنل جدید، تخصیص خدمات، مانیتورینگ عملکرد، تسویه حساب‌های مالی و مدیریت مرخصی‌های فعالان سالن {currentUser.salonName || "خانه زیبایی لجند"}.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2.5 bg-white text-[#0284c7] hover:bg-slate-50 text-xs font-black rounded-xl transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {showAddForm ? "بستن فرم تعریف" : "تعریف آرتیست / پرسنل جدید"}
          </button>
        </div>

        {/* Bento stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/5 space-y-1">
            <p className="text-[9.5px] text-white/70 font-bold">کل پرسنل فعال:</p>
            <p className="text-lg font-black">{toPersianDigits(staffStats.total)} <span className="text-[10px] font-bold">نفر</span></p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/5 space-y-1">
            <p className="text-[9.5px] text-white/70 font-bold">همکاری درصدی / اجاره‌ای:</p>
            <p className="text-lg font-black">{toPersianDigits(staffStats.commission)} <span className="text-[10.5px] text-white/50">درصدی</span> / {toPersianDigits(staffStats.rental)} <span className="text-[10.5px] text-white/50">اجاره</span></p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/5 space-y-1">
            <p className="text-[9.5px] text-white/70 font-bold">پرسنل حقوق ثابت:</p>
            <p className="text-lg font-black">{toPersianDigits(staffStats.fixed)} <span className="text-[10px] font-bold">نفر</span></p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/5 space-y-1">
            <p className="text-[9.5px] text-white/70 font-bold">برترین درآمدزا:</p>
            <p className="text-xs font-black truncate">{staffStats.topEarner ? `${staffStats.topEarner.name} (${formatToman(staffStats.topEarner.amount)})` : "ثبت نشده"}</p>
          </div>
        </div>
      </div>

      {/* 2. Collapsible Form: Add New Artist/Staff */}
      {showAddForm && (
        <form onSubmit={handleAddStaff} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 animate-slide-down">
          <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
            <UserPlus className="text-[#0284c7] w-4.5 h-4.5" />
            ثبت اطلاعات و قرارداد استخدام پرسنل جدید سالن
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600">نام و نام خانوادگی پرسنل:</label>
              <input
                type="text"
                required
                placeholder="مثلاً: شیوا امینی"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600">شماره موبایل همراه:</label>
              <input
                type="text"
                required
                placeholder="مثلاً: ۰۹۱۲۰۰۰۰۰۰۰"
                value={newStaffPhone}
                onChange={(e) => setNewStaffPhone(e.target.value)}
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all font-bold text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600">ایمیل آدرس (اختیاری):</label>
              <input
                type="email"
                placeholder="مثلاً: shiva@example.com"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all font-semibold text-left"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600">عنوان تخصصی و لاین:</label>
              <input
                type="text"
                required
                placeholder="مثلاً: متخصص کاشت مژه و اکستنشن والیوم"
                value={newStaffTitle}
                onChange={(e) => setNewStaffTitle(e.target.value)}
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600">نقش پرسنلی در سیستم:</label>
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value as any)}
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all font-bold"
              >
                <option value="artist">آرتیست تخصصی سالن (خدمات‌دهنده)</option>
                <option value="service-staff">پرسنل عمومی سالن / پشتیبانی</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600">سابقه کار مفید (به سال):</label>
              <input
                type="number"
                min="0"
                max="40"
                value={newStaffExp}
                onChange={(e) => setNewStaffExp(Number(e.target.value))}
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all font-bold text-center"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-600">بیوگرافی و شرح مهارت‌ها:</label>
            <textarea
              rows={2}
              placeholder="توضیحات کوتاهی در مورد مهارت‌ها، افتخارات، یا سوابق کاری پرسنل جهت درج در رزومه سالنی..."
              value={newStaffBio}
              onChange={(e) => setNewStaffBio(e.target.value)}
              className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all resize-none font-medium"
            />
          </div>

          {/* Setup Contract Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
            <h4 className="text-[11.5px] font-black text-slate-800 flex items-center gap-1">
              <FileText className="w-4 h-4 text-slate-500" />
              جزئیات قرارداد همکاری سالنی (قرارداد رسمی)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-black text-slate-600">نوع مدل تسویه حساب و قرارداد:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["درصدی", "اجاره‌ای", "حقوق ثابت"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setContractType(type)}
                      className={`py-2 text-center text-[10.5px] font-black rounded-lg border transition-all cursor-pointer ${
                        contractType === type
                          ? "bg-[#0284c7] text-white border-[#0284c7]"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10.5px] font-black text-slate-600">
                  {contractType === "درصدی" && "میزان پورسانت آرتیست (مثلاً: ۴۰٪ یا ۵۰٪):"}
                  {contractType === "اجاره‌ای" && "مبلغ اجاره‌بهای ماهانه صندلی / لاین:"}
                  {contractType === "حقوق ثابت" && "حقوق ثابت خالص ماهانه (تومان):"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    contractType === "درصدی" ? "مثلاً: ۴۵٪ پورسانت" :
                    contractType === "اجاره‌ای" ? "مثلاً: ۶,۰۰۰,۰۰۰ تومان" : "مثلاً: ۱۲,۰۰۰,۰۰۰ تومان"
                  }
                  value={contractAmount}
                  onChange={(e) => setContractAmount(e.target.value)}
                  className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] transition-all font-bold"
                />
              </div>
            </div>
          </div>

          {/* Service assignment inside creation */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-600 flex items-center gap-1">
              <Settings className="w-4 h-4 text-slate-400" />
              تخصیص نوبت‌ها و لاین‌های خدماتی فعال پرسنل (لاین‌های زیبایی):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100 max-h-44 overflow-y-auto">
              {bookableServices.map(service => {
                const isSelected = selectedServices.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedServices(prev => prev.filter(id => id !== service.id));
                      } else {
                        setSelectedServices(prev => [...prev, service.id]);
                      }
                    }}
                    className={`p-2.5 rounded-lg text-right border text-[10.5px] transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-[#0284c7]/5 border-[#0284c7] text-[#0284c7] font-black"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{service.name}</span>
                    {isSelected ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Plus className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-black py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            تایید نهایی و استخدام پرسنل زیبایی
          </button>
        </form>
      )}

      {/* 3. Filters & List Wrapper */}
      <div className="space-y-4">
        
        {/* Filter bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ListFilter className="w-4.5 h-4.5 text-[#0284c7]" />
            <h4 className="text-xs font-black text-slate-800">فیلتر و پایش همکاران سالن:</h4>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {/* Filter by role */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 px-2.5 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold">سمت:</span>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="text-[10.5px] font-black text-slate-700 bg-transparent border-none outline-none focus:ring-0"
              >
                <option value="all">همه پرسنل</option>
                <option value="artist">آرتیست متخصص</option>
                <option value="service-staff">پشتیبانی و خدمات</option>
              </select>
            </div>

            {/* Filter by contract */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 px-2.5 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold">نوع تسویه:</span>
              <select
                value={filterContract}
                onChange={(e) => setFilterContract(e.target.value as any)}
                className="text-[10.5px] font-black text-slate-700 bg-transparent border-none outline-none focus:ring-0"
              >
                <option value="all">همه مدل‌ها</option>
                <option value="درصدی">تسویه درصدی</option>
                <option value="اجاره‌ای">صندلی اجاره‌ای</option>
                <option value="حقوق ثابت">حقوق ثابت خالص</option>
              </select>
            </div>
          </div>
        </div>

        {/* Directory List of Staff */}
        {filteredStaff.length === 0 ? (
          <div className="bg-white border border-slate-200/60 rounded-2xl p-10 text-center space-y-4">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-400 font-bold leading-relaxed max-w-xs mx-auto">
              هیچ پرسنل یا آرتیستی با فیلترهای مشخص شده در این سالن یافت نشد. می‌توانید از کلید بالا جهت اضافه کردن اولین پرسنل استفاده کنید.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredStaff.map((staff) => {
              // Calculate live metrics
              const totalBookings = clientRequests.filter(r => r.targetId === staff.id && r.status !== "cancelled").length;
              const pendingLeave = leaveRequests.filter(l => l.staffId === staff.id && l.status === "pending").length;
              const approvedLeave = leaveRequests.filter(l => l.staffId === staff.id && (l.status === "accepted" || l.status === "logged")).length;
              const balanceSummary = calculateEmployeeBalance(staff, transactions);

              return (
                <div key={staff.id} className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden hover:shadow-md transition-all flex flex-col lg:flex-row text-right">
                  
                  {/* Left Column (Meta details & Basic Profile) */}
                  <div className="p-5 lg:w-72 bg-slate-50/50 border-b lg:border-b-0 lg:border-l border-slate-100 flex flex-col justify-between space-y-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={staff.avatar}
                        alt={staff.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-inner shrink-0"
                      />
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-900">{staff.name}</h4>
                        <span className="inline-block px-2.5 py-0.5 bg-[#0284c7]/10 text-[#0284c7] text-[8.5px] font-black rounded-md">
                          {staff.role === "artist" ? "آرتیست متخصص" : "خدمات و پشتیبانی"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-[10.5px] text-slate-500 font-bold">
                      <p className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        تلفن: <span className="text-slate-800 font-black">{toPersianDigits(staff.phone)}</span>
                      </p>
                      <p className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        ایمیل: <span className="text-slate-800 font-black truncate max-w-44 text-left" dir="ltr">{staff.email}</span>
                      </p>
                      <p className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        تخصص: <span className="text-slate-800 font-black">{staff.title}</span>
                      </p>
                      <p className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        سابقه کار: <span className="text-slate-800 font-black">{toPersianDigits(staff.yearsOfExperience || 0)} سال</span>
                      </p>
                    </div>

                    <div className="bg-white border border-slate-100 p-2.5 rounded-xl space-y-1.5">
                      <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                        <span>نوع تسویه حساب:</span>
                        <span className="text-[#0284c7] font-black">{staff.contract?.contractType || "درصدی"}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600 font-black">
                        <span>شرط معین:</span>
                        <span>{staff.contract?.amount || "۴۰٪"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (Live performance & Interactive utilities) */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-5">
                    
                    {/* Live Performance / Monitoring Widgets */}
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                        شاخص‌های عملکرد و مانیتورینگ زنده پرسنل
                      </h5>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        
                        {/* Bookings Performance */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                          <p className="text-[9.5px] text-slate-400 font-bold">تعداد کل نوبت‌های کاری:</p>
                          <p className="text-sm font-black text-slate-800">{toPersianDigits(totalBookings)} نوبت فعال</p>
                          <div className="flex items-center gap-1 text-[8.5px] text-slate-400 font-medium">
                            <Clock className="w-3 h-3 text-slate-300" />
                            <span>رزرو شده از طریق جامعه لجندین</span>
                          </div>
                        </div>

                        {/* Leave attendance */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                          <p className="text-[9.5px] text-slate-400 font-bold">مرخصی‌ها و حضور غیاب:</p>
                          <p className="text-sm font-black text-slate-800">{toPersianDigits(approvedLeave)} روز ثبت شده</p>
                          <div className="flex items-center gap-1 text-[8.5px] text-slate-400 font-medium">
                            <Calendar className="w-3 h-3 text-slate-300" />
                            <span>{toPersianDigits(pendingLeave)} درخواست در انتظار تایید</span>
                          </div>
                        </div>

                        {/* Financial Ledger Balance */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                          <p className="text-[9.5px] text-slate-400 font-bold">تراز نهایی معین پرسنل:</p>
                          <p className={`text-sm font-black ${
                            balanceSummary.netBalance > 0 ? "text-emerald-600" : 
                            balanceSummary.netBalance < 0 ? "text-rose-600" : "text-slate-600"
                          }`}>
                            {balanceSummary.netBalance > 0 ? `${formatToman(balanceSummary.netBalance)} + طلبکار` :
                             balanceSummary.netBalance < 0 ? `${formatToman(Math.abs(balanceSummary.netBalance))} - بدهکار` : "تسویه کامل"}
                          </p>
                          <div className="flex items-center gap-1 text-[8.5px] text-slate-400 font-medium">
                            <DollarSign className="w-3 h-3 text-slate-300" />
                            <span>درآمد تولیدی: {formatToman(balanceSummary.totalGeneratedIncome)}</span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Assigned services tags display */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-slate-400 font-black">لاین‌ها و خدمات تخصیصی این آرتیست:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {staff.assignedServiceIds && staff.assignedServiceIds.length > 0 ? (
                          staff.assignedServiceIds.map(serviceId => {
                            const foundSvc = bookableServices.find(s => s.id === serviceId);
                            return (
                              <span key={serviceId} className="px-2 py-1 bg-slate-100 text-slate-700 text-[9.5px] font-bold rounded-lg border border-slate-200">
                                {foundSvc ? foundSvc.name : serviceId}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold">هیچ لاین خدماتی تخصیص داده نشده است.</span>
                        )}
                      </div>
                    </div>

                    {/* Interactive manager utilities */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setPaymentStaff(staff);
                          setPaymentAmount("");
                          setPaymentDesc("");
                        }}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-black rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        ثبت تسویه حساب / واریز حقوق
                      </button>

                      <button
                        onClick={() => {
                          setLeaveStaff(staff);
                          setLeaveStart("1405/04/20");
                          setLeaveEnd("1405/04/22");
                          setLeaveNote("");
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-black rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-slate-200"
                      >
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        ثبت مرخصی مستقیم
                      </button>

                      <button
                        onClick={() => {
                          setServiceStaff(staff);
                          setServiceChecklist(staff.assignedServiceIds || []);
                        }}
                        className="px-3 py-2 bg-[#0284c7]/10 hover:bg-[#0284c7]/20 text-[#0284c7] text-[10.5px] font-black rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        تغییر خدمات / لاین‌ها
                      </button>

                      <button
                        onClick={() => handleTerminateContract(staff)}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10.5px] font-black rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-rose-150 mr-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        خاتمه قرارداد همکاری
                      </button>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* 4. MODAL: Payment / Settlement Transaction */}
      {paymentStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden text-right" dir="rtl">
            <div className="bg-gradient-to-l from-emerald-600 to-emerald-700 p-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                ثبت سند مالی و تسویه حساب با پرسنل
              </h3>
              <button
                onClick={() => setPaymentStaff(null)}
                className="text-white hover:text-white/80 font-bold text-xs cursor-pointer"
              >
                بستن ×
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-bold text-slate-700 space-y-1">
                <p>دریافت‌کننده وجه: <strong className="text-slate-900">{paymentStaff.name}</strong> ({paymentStaff.title})</p>
                <p>مدل همکاری مکتوب: <strong className="text-slate-900">{paymentStaff.contract?.contractType}</strong> ({paymentStaff.contract?.amount})</p>
                <p>طلب فعلی آرتیست بر اساس فاکتورها: <strong className="text-slate-900">{formatToman(calculateEmployeeBalance(paymentStaff, transactions).netBalance)} تومان</strong></p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700">مبلغ واریزی / تسویه (تومان):</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: ۴,۵۰۰,۰۰۰"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700">شرح بابت سند مالی:</label>
                <textarea
                  rows={3}
                  placeholder="مثلاً: پرداخت پورسانت آذر ماه لاین رنگ موی تخصصی روسی..."
                  value={paymentDesc}
                  onChange={(e) => setPaymentDesc(e.target.value)}
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all resize-none font-medium"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-3 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  تایید و ثبت سند در حسابداری
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStaff(null)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: Direct Leave Recording */}
      {leaveStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden text-right" dir="rtl">
            <div className="bg-gradient-to-l from-slate-700 to-slate-800 p-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                ثبت مرخصی مستقیم برای پرسنل سالن
              </h3>
              <button
                onClick={() => setLeaveStaff(null)}
                className="text-white hover:text-white/80 font-bold text-xs cursor-pointer"
              >
                بستن ×
              </button>
            </div>

            <form onSubmit={handleAddLeave} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-bold text-slate-700">
                ثبت ایام عدم حضور یا مرخصی استعلاجی/استحقاقی برای: <strong className="text-slate-900">{leaveStaff.name}</strong>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700">شروع مرخصی (شمسی):</label>
                  <input
                    type="text"
                    required
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-slate-500 font-bold text-center"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700">پایان مرخصی (شمسی):</label>
                  <input
                    type="text"
                    required
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-slate-500 font-bold text-center"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700">توضیحات و علت عدم حضور:</label>
                <textarea
                  rows={2}
                  placeholder="مثلاً: شرکت در سمینار تخصصی یا دلایل شخصی..."
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-slate-500 transition-all resize-none font-medium"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black py-3 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  ثبت رسمی مرخصی
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveStaff(null)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: Edit Assigned Services */}
      {serviceStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-100 overflow-hidden text-right" dir="rtl">
            <div className="bg-gradient-to-l from-[#0284c7] to-[#0369a1] p-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Settings className="w-5 h-5 animate-spin-slow" />
                تغییر لاین‌ها و لاین‌های خدماتی تخصیصی به پرسنل
              </h3>
              <button
                onClick={() => setServiceStaff(null)}
                className="text-white hover:text-white/80 font-bold text-xs cursor-pointer"
              >
                بستن ×
              </button>
            </div>

            <form onSubmit={handleSaveServices} className="p-5 space-y-4">
              <div className="bg-[#0284c7]/5 p-3 rounded-xl border border-[#0284c7]/15 text-xs font-bold text-[#0284c7]">
                تغییر و تخصیص لاین‌های مجاز پذیرش نوبت برای: <strong className="text-slate-800 font-black">{serviceStaff.name}</strong> ({serviceStaff.title})
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700">لاین‌های خدماتی فعال را علامت بزنید:</label>
                <div className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-150">
                  {bookableServices.map(service => {
                    const isChecked = serviceChecklist.includes(service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleServiceInChecklist(service.id)}
                        className={`p-3 rounded-lg text-right border text-[10.5px] transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                          isChecked
                            ? "bg-[#0284c7]/5 border-[#0284c7] text-[#0284c7] font-black shadow-3xs"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate">{service.name}</span>
                        {isChecked ? (
                          <span className="w-4 h-4 rounded-full bg-[#0284c7] text-white flex items-center justify-center text-[9px] font-black">✓</span>
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-300 bg-white" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-black py-3 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  ذخیره و به‌روزرسانی لاین‌ها
                </button>
                <button
                  type="button"
                  onClick={() => setServiceStaff(null)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
