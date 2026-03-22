import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useAdminGetCompanySettings,
  useAdminUpdateCompanySettings,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Building2, Save, Globe, Phone, Mail, MapPin, Receipt, Palette,
  Server, Eye, EyeOff, FlaskConical, CheckCircle2, XCircle, Loader2, Landmark,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SA_PROVINCES = [
  "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape",
  "Free State", "Mpumalanga", "Limpopo", "North West", "Northern Cape",
];

export default function AdminCompanySettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading } = useAdminGetCompanySettings();
  const updateSettings = useAdminUpdateCompanySettings();

  const [form, setForm] = useState({
    companyName: "",
    email: "",
    phone: "",
    unitStreetNumber: "",
    buildingComplex: "",
    streetName: "",
    address: "",
    address2: "",
    city: "",
    province: "",
    postalCode: "",
    country: "South Africa",
    vatNumber: "",
    website: "",
    primaryColor: "#4BA3E3",
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
    smtpSecure: false,
    bankName: "",
    bankAccountHolder: "",
    bankAccountNumber: "",
    bankAccountType: "",
    bankBranchCode: "",
    bankSwiftCode: "",
    bankReference: "",
    didResellerPriceExclVat: "",
    didResellerPriceInclVat: "",
  });

  const [isDirty, setIsDirty] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [smtpTestState, setSmtpTestState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [smtpTestMsg, setSmtpTestMsg] = useState("");

  useEffect(() => {
    if (settings) {
      const s = settings as any;
      setForm({
        companyName: s.companyName ?? "",
        email: s.email ?? "",
        phone: s.phone ?? "",
        unitStreetNumber: s.unitStreetNumber ?? "",
        buildingComplex: s.buildingComplex ?? "",
        streetName: s.streetName ?? "",
        address: s.address ?? "",
        address2: s.address2 ?? "",
        city: s.city ?? "",
        province: s.province ?? "",
        postalCode: s.postalCode ?? "",
        country: s.country ?? "South Africa",
        vatNumber: s.vatNumber ?? "",
        website: s.website ?? "",
        primaryColor: s.primaryColor ?? "#4BA3E3",
        smtpHost: s.smtpHost ?? "",
        smtpPort: s.smtpPort ?? "587",
        smtpUser: s.smtpUser ?? "",
        smtpPass: s.smtpPass ?? "",
        smtpFrom: s.smtpFrom ?? "",
        smtpSecure: s.smtpSecure ?? false,
        bankName: s.bankName ?? "",
        bankAccountHolder: s.bankAccountHolder ?? "",
        bankAccountNumber: s.bankAccountNumber ?? "",
        bankAccountType: s.bankAccountType ?? "",
        bankBranchCode: s.bankBranchCode ?? "",
        bankSwiftCode: s.bankSwiftCode ?? "",
        bankReference: s.bankReference ?? "",
        didResellerPriceExclVat: s.didResellerPriceExclVat != null ? String(s.didResellerPriceExclVat) : "",
        didResellerPriceInclVat: s.didResellerPriceInclVat != null ? String(s.didResellerPriceInclVat) : "",
      });
      setIsDirty(false);
    }
  }, [settings]);

  const set = (key: string, val: string | boolean) => {
    setForm(f => ({ ...f, [key]: val }));
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync({ data: form as any });
      toast({ title: "Company settings saved" });
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company-settings"] });
    } catch {
      toast({ title: "Error saving settings", variant: "destructive" });
    }
  };

  const handleTestSmtp = async () => {
    setSmtpTestState("loading");
    setSmtpTestMsg("");
    try {
      const res = await fetch("/api/admin/company-settings/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: form.email || form.smtpUser }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test failed");
      setSmtpTestState("success");
      setSmtpTestMsg(data.message ?? "Test email sent successfully");
    } catch (err: any) {
      setSmtpTestState("error");
      setSmtpTestMsg(err.message ?? "SMTP test failed");
    }
  };

  const discardForm = () => {
    if (!settings) return;
    const s = settings as any;
    setForm({
      companyName: s.companyName ?? "",
      email: s.email ?? "",
      phone: s.phone ?? "",
      unitStreetNumber: s.unitStreetNumber ?? "",
      buildingComplex: s.buildingComplex ?? "",
      streetName: s.streetName ?? "",
      address: s.address ?? "",
      address2: s.address2 ?? "",
      city: s.city ?? "",
      province: s.province ?? "",
      postalCode: s.postalCode ?? "",
      country: s.country ?? "South Africa",
      vatNumber: s.vatNumber ?? "",
      website: s.website ?? "",
      primaryColor: s.primaryColor ?? "#4BA3E3",
      smtpHost: s.smtpHost ?? "",
      smtpPort: s.smtpPort ?? "587",
      smtpUser: s.smtpUser ?? "",
      smtpPass: s.smtpPass ?? "",
      smtpFrom: s.smtpFrom ?? "",
      smtpSecure: s.smtpSecure ?? false,
      bankName: s.bankName ?? "",
      bankAccountHolder: s.bankAccountHolder ?? "",
      bankAccountNumber: s.bankAccountNumber ?? "",
      bankAccountType: s.bankAccountType ?? "",
      bankBranchCode: s.bankBranchCode ?? "",
      bankSwiftCode: s.bankSwiftCode ?? "",
      bankReference: s.bankReference ?? "",
      didResellerPriceExclVat: s.didResellerPriceExclVat != null ? String(s.didResellerPriceExclVat) : "",
      didResellerPriceInclVat: s.didResellerPriceInclVat != null ? String(s.didResellerPriceInclVat) : "",
    });
    setIsDirty(false);
  };

  const inputCls = "w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none text-sm";
  const labelCls = "block text-sm font-medium text-muted-foreground mb-1.5";

  if (isLoading) {
    return (
      <AppLayout role="admin" title="Company Settings">
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="admin" title="Company Settings">
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">

        {/* Company Identity */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Company Identity</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Company Name</label>
                <input value={form.companyName} onChange={e => set("companyName", e.target.value)} className={inputCls} placeholder="Black Tie VoIP" required />
              </div>
              <div>
                <label className={labelCls}>VAT Number</label>
                <input value={form.vatNumber} onChange={e => set("vatNumber", e.target.value)} className={inputCls} placeholder="e.g. 4123456789" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input value={form.website} onChange={e => set("website", e.target.value)} className={inputCls + " pl-9"} placeholder="https://blacktievoip.co.za" type="url" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Contact Details */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Contact Details</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="email" value={form.email} onChange={e => set("email", e.target.value)} className={inputCls + " pl-9"} placeholder="info@blacktievoip.co.za" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input value={form.phone} onChange={e => set("phone", e.target.value)} className={inputCls + " pl-9"} placeholder="+27 11 000 0000" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Physical Address */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Physical Address</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Unit / Street Number</label>
                <input value={form.unitStreetNumber} onChange={e => set("unitStreetNumber", e.target.value)} className={inputCls} placeholder="e.g. Unit 4 / 12" />
              </div>
              <div>
                <label className={labelCls}>Building / Complex</label>
                <input value={form.buildingComplex} onChange={e => set("buildingComplex", e.target.value)} className={inputCls} placeholder="e.g. Sunridge Business Park" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Street Name</label>
              <input value={form.streetName} onChange={e => set("streetName", e.target.value)} className={inputCls} placeholder="e.g. Main Road" />
            </div>
            <div>
              <label className={labelCls}>Address Line 2 <span className="text-xs font-normal">(optional)</span></label>
              <input value={form.address2} onChange={e => set("address2", e.target.value)} className={inputCls} placeholder="e.g. Industrial area, Estate name" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>City / Town</label>
                <input value={form.city} onChange={e => set("city", e.target.value)} className={inputCls} placeholder="Johannesburg" />
              </div>
              <div>
                <label className={labelCls}>Province</label>
                <select value={form.province} onChange={e => set("province", e.target.value)} className={inputCls + " appearance-none"}>
                  <option value="">Select…</option>
                  {SA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Postal Code</label>
                <input value={form.postalCode} onChange={e => set("postalCode", e.target.value)} className={inputCls} placeholder="2001" maxLength={10} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Country</label>
              <input value={form.country} onChange={e => set("country", e.target.value)} className={inputCls} placeholder="South Africa" />
            </div>
          </div>
        </motion.div>

        {/* Branding */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Branding</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-6">
              <div>
                <label className={labelCls}>Primary Colour</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={e => set("primaryColor", e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-background p-0.5"
                  />
                  <input
                    value={form.primaryColor}
                    onChange={e => set("primaryColor", e.target.value)}
                    className={inputCls + " w-32 font-mono"}
                    placeholder="#4BA3E3"
                    maxLength={7}
                  />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-2">Preview</p>
                <div className="flex gap-2">
                  <div className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: form.primaryColor }}>Button</div>
                  <div className="px-3 py-2 rounded-lg text-sm font-medium border" style={{ color: form.primaryColor, borderColor: form.primaryColor + "40", backgroundColor: form.primaryColor + "10" }}>Badge</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Email / SMTP */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Email / SMTP</h2>
            <span className="ml-auto text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full border border-border/60">Used for order notifications</span>
          </div>
          <div className="p-6 space-y-5">

            {/* Host + Port */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>SMTP Host</label>
                <input
                  value={form.smtpHost}
                  onChange={e => set("smtpHost", e.target.value)}
                  className={inputCls}
                  placeholder="e.g. smtp.gmail.com"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelCls}>Port</label>
                <input
                  value={form.smtpPort}
                  onChange={e => set("smtpPort", e.target.value)}
                  className={inputCls}
                  placeholder="587"
                  type="number"
                  min={1}
                  max={65535}
                />
              </div>
            </div>

            {/* Username + Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Username / Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    value={form.smtpUser}
                    onChange={e => set("smtpUser", e.target.value)}
                    className={inputCls + " pl-9"}
                    placeholder="you@gmail.com"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Password / App Password</label>
                <div className="relative">
                  <input
                    value={form.smtpPass}
                    onChange={e => set("smtpPass", e.target.value)}
                    type={showSmtpPass ? "text" : "password"}
                    className={inputCls + " pr-10"}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* From address + TLS toggle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  From Address
                  <span className="text-xs font-normal ml-1">(optional — defaults to username)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    value={form.smtpFrom}
                    onChange={e => set("smtpFrom", e.target.value)}
                    className={inputCls + " pl-9"}
                    placeholder="noreply@blacktievoip.co.za"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Security</label>
                <div className="flex items-center gap-3 h-[42px]">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      onClick={() => set("smtpSecure", !form.smtpSecure)}
                      className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative ${form.smtpSecure ? "bg-primary" : "bg-muted-foreground/20"}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.smtpSecure ? "translate-x-6" : "translate-x-1"}`} />
                    </div>
                    <span className="text-sm text-foreground">Use SSL/TLS <span className="text-muted-foreground">(port 465)</span></span>
                  </label>
                </div>
              </div>
            </div>

            {/* Test SMTP */}
            <div className="pt-2 border-t border-border/40">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={smtpTestState === "loading" || !form.smtpHost || !form.smtpUser || !form.smtpPass}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {smtpTestState === "loading" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Testing…</>
                  ) : (
                    <><FlaskConical className="w-4 h-4" /> Test SMTP Connection</>
                  )}
                </button>

                {smtpTestState === "success" && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    {smtpTestMsg}
                  </div>
                )}
                {smtpTestState === "error" && (
                  <div className="flex items-center gap-2 text-sm text-destructive font-medium">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    {smtpTestMsg}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Sends a test email to your company email address to verify the SMTP connection. Save settings first if you've made changes.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Bank Details */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Bank Details</h2>
            <span className="ml-auto text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full border border-border/60">Printed on invoices &amp; statements</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Bank Name</label>
                <input value={form.bankName} onChange={e => set("bankName", e.target.value)} className={inputCls} placeholder="e.g. First National Bank" />
              </div>
              <div>
                <label className={labelCls}>Account Holder Name</label>
                <input value={form.bankAccountHolder} onChange={e => set("bankAccountHolder", e.target.value)} className={inputCls} placeholder="e.g. Black Tie VoIP (Pty) Ltd" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Account Number</label>
                <input value={form.bankAccountNumber} onChange={e => set("bankAccountNumber", e.target.value)} className={inputCls} placeholder="e.g. 62012345678" />
              </div>
              <div>
                <label className={labelCls}>Account Type</label>
                <select value={form.bankAccountType} onChange={e => set("bankAccountType", e.target.value)} className={inputCls + " appearance-none"}>
                  <option value="">Select…</option>
                  <option value="Current">Current</option>
                  <option value="Savings">Savings</option>
                  <option value="Transmission">Transmission</option>
                  <option value="Bond">Bond</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Branch Code <span className="text-xs font-normal">(universal branch code)</span></label>
                <input value={form.bankBranchCode} onChange={e => set("bankBranchCode", e.target.value)} className={inputCls} placeholder="e.g. 250655" maxLength={10} />
              </div>
              <div>
                <label className={labelCls}>SWIFT / BIC Code <span className="text-xs font-normal">(optional)</span></label>
                <input value={form.bankSwiftCode} onChange={e => set("bankSwiftCode", e.target.value)} className={inputCls} placeholder="e.g. FIRNZAJJ" maxLength={11} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Payment Reference <span className="text-xs font-normal">(optional — e.g. invoice number placeholder)</span></label>
              <input value={form.bankReference} onChange={e => set("bankReference", e.target.value)} className={inputCls} placeholder="e.g. Invoice No." />
            </div>
          </div>
        </motion.div>

        {/* DID Reseller Pricing */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-5 border-b border-border bg-primary/5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Phone className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">DID Number Pricing</h2>
              <p className="text-xs text-muted-foreground">Monthly reseller rate shown to resellers when ordering DID numbers</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Monthly Price — Excl VAT (R)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.didResellerPriceExclVat}
                  onChange={e => {
                    const excl = parseFloat(e.target.value);
                    set("didResellerPriceExclVat", e.target.value);
                    if (!isNaN(excl) && form.didResellerPriceInclVat === "") {
                      set("didResellerPriceInclVat", (excl * 1.15).toFixed(2));
                    }
                  }}
                  className={inputCls}
                  placeholder="e.g. 60.00"
                />
              </div>
              <div>
                <label className={labelCls}>Monthly Price — Incl VAT (R) <span className="text-xs font-normal text-muted-foreground">(auto ↔)</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.didResellerPriceInclVat}
                  onChange={e => {
                    const incl = parseFloat(e.target.value);
                    set("didResellerPriceInclVat", e.target.value);
                    if (!isNaN(incl)) {
                      set("didResellerPriceExclVat", (incl / 1.15).toFixed(2));
                    }
                  }}
                  className={inputCls}
                  placeholder="e.g. 69.00"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Save */}
        <div className="flex justify-end gap-3 pb-4">
          {isDirty && (
            <button
              type="button"
              onClick={discardForm}
              className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5 border border-border"
            >
              Discard Changes
            </button>
          )}
          <button
            type="submit"
            disabled={updateSettings.isPending || !isDirty}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            <Save className="w-4 h-4" />
            {updateSettings.isPending ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
