import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useGetCatalogServices,
  useGetCatalogProducts,
  useGetCatalogHostingPackages,
  useGetCatalogDomainTlds,
  useGetCatalogConnectivity,
  useGetCatalogCybersecurity,
  useGetCatalogDataSecurity,
  useGetCatalogWebDevelopment,
  useGetCatalogVoipSolutions,
  useResellerGetAreaCodes,
  useResellerGetAvailableDids,
  useCreateOrder,
  Service,
  Did,
} from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Server, Package, Phone, CheckCircle2, MapPin, Globe,
  HardDrive, Database, Shield, Wifi, Search, X, Loader2, Tag, Calendar,
  User, Network, Lock, Code, Plus, Minus, Trash2, ChevronDown, Receipt,
  Calculator, Sparkles, ArrowLeft,
} from "lucide-react";
import { formatZar } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemType =
  | "service" | "product" | "did" | "hosting" | "domain"
  | "connectivity" | "cybersecurity" | "data-security"
  | "web-development" | "voip-solutions";

interface CartItem {
  itemType: ItemType;
  referenceId: number;
  name: string;
  unitPriceExclVat: number;
  unitPriceInclVat: number;
  quantity: number;
}

type Tab =
  | "services" | "connectivity" | "products" | "hosting" | "domains"
  | "cybersecurity" | "data-security" | "web-development" | "voip-solutions";

// ─── Constants ────────────────────────────────────────────────────────────────

const VAT_RATE = 0.15;
const FRESH = { query: { staleTime: 30_000 } } as const;

/** Item types billed monthly */
const MONTHLY_TYPES = new Set<ItemType>([
  "service", "hosting", "did", "connectivity",
  "cybersecurity", "data-security", "voip-solutions",
]);

/** Item types billed once-off */
const ONCE_OFF_TYPES = new Set<ItemType>([
  "product", "domain", "web-development",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function vatFromExcl(exclVat: number) {
  return { exclVat, vat: exclVat * VAT_RATE, inclVat: exclVat * (1 + VAT_RATE) };
}

function vatPrices(item: any): { exclVat: number; inclVat: number } {
  const excl = item.resellerPriceExclVat ?? item.price ?? 0;
  const incl = item.resellerPriceInclVat ?? item.priceInclVat ?? excl * (1 + VAT_RATE);
  return { exclVat: Number(excl), inclVat: Number(incl) };
}

function isBundleService(s: any): boolean {
  const hay = `${s.name} ${s.categoryName ?? ""}`.toLowerCase();
  return /(local|international|extension|minute[s]?|min)\s*(bundle|pack)|min\s*pack|talktime|call\s*pack/.test(hay);
}

function isMinuteBundleVoipItem(item: any): boolean {
  return /minute[s]?\s*bundle[s]?|minute[s]?\s*pack[s]?/i.test(item.categoryName ?? "");
}

function isVoipService(s: any): boolean {
  const hay = `${s.name} ${s.categoryName ?? ""}`.toLowerCase();
  return /voip|pbx|sip|extension|hosted\s*phone/.test(hay);
}

/** Pro-rata: proportion of current month remaining (inclusive of today). */
function proRataInfo(date: Date = new Date()) {
  const y = date.getFullYear(), m = date.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const dayOfMonth = date.getDate();
  const daysRemaining = daysInMonth - dayOfMonth + 1;
  return { factor: daysRemaining / daysInMonth, daysRemaining, daysInMonth, dayOfMonth };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CartRow({
  item,
  onQty,
  onRemove,
}: {
  item: CartItem;
  onQty: (id: number, type: ItemType, delta: number) => void;
  onRemove: (id: number, type: ItemType) => void;
}) {
  const isMonthly = MONTHLY_TYPES.has(item.itemType);
  const isFree = item.unitPriceInclVat === 0;
  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/10 border border-border/40 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${isMonthly ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/40 text-muted-foreground border-border/60"}`}>
            {isMonthly ? "Monthly" : "Once-off"}
          </span>
          <span className="text-xs text-muted-foreground">
            {isFree ? "Free" : `${formatZar(item.unitPriceInclVat)} incl VAT`}
          </span>
        </div>
      </div>

      {item.itemType !== "did" && (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onQty(item.referenceId, item.itemType, -1)} className="w-6 h-6 rounded bg-muted/40 hover:bg-muted/70 flex items-center justify-center transition-colors">
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-5 text-center text-xs font-semibold">{item.quantity}</span>
          <button onClick={() => onQty(item.referenceId, item.itemType, 1)} className="w-6 h-6 rounded bg-muted/40 hover:bg-muted/70 flex items-center justify-center transition-colors">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}

      <button onClick={() => onRemove(item.referenceId, item.itemType)} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewOrder() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const params = new URLSearchParams(searchString);

  // ── Catalog data ──
  const { data: services = [], isLoading: servicesLoading } = useGetCatalogServices(FRESH);
  const { data: products = [] } = useGetCatalogProducts(FRESH);
  const { data: hostingPackages = [] } = useGetCatalogHostingPackages(FRESH);
  const { data: domainTlds = [] } = useGetCatalogDomainTlds(FRESH);
  const { data: connectivity = [] } = useGetCatalogConnectivity(FRESH);
  const { data: cybersecurity = [] } = useGetCatalogCybersecurity(FRESH);
  const { data: dataSecurity = [] } = useGetCatalogDataSecurity(FRESH);
  const { data: webDevelopment = [] } = useGetCatalogWebDevelopment(FRESH);
  const { data: rawVoipSolutions = [] } = useGetCatalogVoipSolutions(FRESH);
  const voipSolutions = (rawVoipSolutions as any[]).filter(i => !isMinuteBundleVoipItem(i));

  const { data: areaCodes = [] } = useResellerGetAreaCodes(FRESH);
  const { data: clients = [] } = useQuery({
    queryKey: ["reseller-clients"],
    queryFn: async () => {
      const r = await fetch("/api/reseller/clients", { credentials: "include" });
      return r.ok ? (r.json() as Promise<Array<{ id: number; companyName: string; contactName: string }>>) : [];
    },
  });

  const createOrder = useCreateOrder();

  // ── UI state ──
  const prefillTab = params.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(
    prefillTab && ["services","connectivity","products","hosting","domains","cybersecurity","data-security","web-development","voip-solutions"].includes(prefillTab)
      ? prefillTab : "services"
  );
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>();
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // ── Cart ──
  const [cart, setCart] = useState<CartItem[]>([]);

  // ── DID panel state ──
  const [didPanelKey, setDidPanelKey] = useState<string | null>(null);
  const [voipAreaCodeId, setVoipAreaCodeId] = useState<number | undefined>();
  const [voipSelectedDidId, setVoipSelectedDidId] = useState<number | null>(null);
  const [voipBundleServiceId, setVoipBundleServiceId] = useState<number | null>(null);

  const { data: availableDids = [], isLoading: didsLoading } = useResellerGetAvailableDids(
    { areaCodeId: voipAreaCodeId! },
    { query: { enabled: !!voipAreaCodeId } }
  );

  // Reset search/filter on tab change
  useEffect(() => { setSearch(""); setCategoryFilter(""); }, [tab]);

  // ── Derived catalog lists ──
  const displayServices = (services as Service[]).filter(s => !isBundleService(s));
  const bundleServices = (services as Service[]).filter(isBundleService);

  function applyFilters<T extends { name: string; categoryName?: string | null; description?: string | null }>(items: T[]): T[] {
    return items.filter(i => {
      const q = search.toLowerCase();
      const matchesSearch = !q || i.name.toLowerCase().includes(q) || (i.categoryName ?? "").toLowerCase().includes(q);
      const matchesCat = !categoryFilter || i.categoryName === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }

  const tabItems: any[] = (() => {
    switch (tab) {
      case "services":      return displayServices as any[];
      case "connectivity":  return connectivity as any[];
      case "products":      return products as any[];
      case "hosting":       return hostingPackages as any[];
      case "cybersecurity": return cybersecurity as any[];
      case "data-security": return dataSecurity as any[];
      case "web-development": return webDevelopment as any[];
      case "voip-solutions":  return voipSolutions;
      default: return [];
    }
  })();

  const categories = useMemo(
    () => Array.from(new Set(tabItems.map(i => i.categoryName).filter(Boolean))).sort() as string[],
    [tab, tabItems.length]
  );

  const filtered = tab === "domains" ? (domainTlds as any[]) : applyFilters(tabItems);

  // ── Cart helpers ──
  function cartQty(refId: number, type: ItemType) {
    return cart.find(i => i.referenceId === refId && i.itemType === type)?.quantity ?? 0;
  }

  function addToCart(item: CartItem) {
    setCart(prev => {
      const existing = prev.find(i => i.referenceId === item.referenceId && i.itemType === item.itemType);
      if (existing) return prev.map(i => i === existing ? { ...i, quantity: i.quantity + item.quantity } : i);
      return [...prev, item];
    });
  }

  function updateQty(refId: number, type: ItemType, delta: number) {
    setCart(prev =>
      prev.flatMap(i => {
        if (i.referenceId !== refId || i.itemType !== type) return [i];
        const q = i.quantity + delta;
        return q <= 0 ? [] : [{ ...i, quantity: q }];
      })
    );
  }

  function removeFromCart(refId: number, type: ItemType) {
    setCart(prev => prev.filter(i => !(i.referenceId === refId && i.itemType === type)));
  }

  // ── DID panel helpers ──
  function closeDIDPanel() {
    setDidPanelKey(null);
    setVoipAreaCodeId(undefined);
    setVoipSelectedDidId(null);
    setVoipBundleServiceId(null);
  }

  function openDIDPanel(key: string) {
    if (didPanelKey === key) { closeDIDPanel(); return; }
    setDidPanelKey(key);
    setVoipAreaCodeId(undefined);
    setVoipSelectedDidId(null);
    setVoipBundleServiceId(null);
  }

  function confirmDID() {
    const did = (availableDids as any[]).find(d => d.id === voipSelectedDidId);
    if (!did) return;
    addToCart({ referenceId: did.id, itemType: "did", name: `DID: ${did.number}`, unitPriceExclVat: 0, unitPriceInclVat: 0, quantity: 1 });
    if (voipBundleServiceId) {
      const bundle = bundleServices.find(b => b.id === voipBundleServiceId);
      if (bundle) {
        const { exclVat, inclVat } = vatPrices(bundle);
        addToCart({ referenceId: bundle.id, itemType: "service", name: bundle.name, unitPriceExclVat: exclVat, unitPriceInclVat: inclVat, quantity: 1 });
      }
    }
    closeDIDPanel();
    toast({ title: "DID added", description: `${did.number} added to your order.` });
  }

  // ── Financial calculations ──
  const monthlyCart = cart.filter(i => MONTHLY_TYPES.has(i.itemType));
  const onceOffCart = cart.filter(i => ONCE_OFF_TYPES.has(i.itemType));

  const monthlyExcl = monthlyCart.reduce((s, i) => s + i.unitPriceExclVat * i.quantity, 0);
  const onceOffExcl = onceOffCart.reduce((s, i) => s + i.unitPriceExclVat * i.quantity, 0);

  const monthly = vatFromExcl(monthlyExcl);
  const onceOff = vatFromExcl(onceOffExcl);

  const pr = proRataInfo();
  const proRata = vatFromExcl(monthlyExcl * pr.factor);

  const dueTodayExcl = proRata.exclVat + onceOff.exclVat;
  const dueToday = vatFromExcl(dueTodayExcl);

  const cartIsEmpty = cart.length === 0;

  // ── Submit ──
  async function handleSubmit() {
    if (cartIsEmpty) return;
    try {
      await createOrder.mutateAsync({
        data: {
          clientId: selectedClientId,
          notes: notes || undefined,
          items: cart.map(i => ({
            itemType: i.itemType,
            referenceId: i.referenceId,
            name: i.name,
            unitPriceExclVat: i.unitPriceExclVat,
            unitPriceInclVat: i.unitPriceInclVat,
            quantity: i.quantity,
          })),
        }
      });
      setSubmitted(true);
      toast({ title: "Order placed!", description: "Your order has been submitted successfully." });
      setTimeout(() => setLocation("/reseller"), 2000);
    } catch {
      toast({ title: "Error", description: "Failed to place order. Please try again.", variant: "destructive" });
    }
  }

  // ── Tab config ──
  const tabs: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: "services",       label: "Services",      icon: Server,   count: displayServices.length },
    { id: "connectivity",   label: "Connectivity",  icon: Network,  count: (connectivity as any[]).length },
    { id: "products",       label: "Hardware",      icon: HardDrive,count: (products as any[]).length },
    { id: "hosting",        label: "Hosting",       icon: Globe,    count: (hostingPackages as any[]).length },
    { id: "domains",        label: "Domains",       icon: Tag,      count: (domainTlds as any[]).length },
    { id: "cybersecurity",  label: "Cyber",         icon: Shield,   count: (cybersecurity as any[]).length },
    { id: "data-security",  label: "Data Sec",      icon: Lock,     count: (dataSecurity as any[]).length },
    { id: "web-development",label: "Web Dev",       icon: Code,     count: (webDevelopment as any[]).length },
    { id: "voip-solutions", label: "VoIP",          icon: Phone,    count: voipSolutions.length },
  ];

  if (submitted) {
    return (
      <AppLayout role="reseller" title="New Order">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-500" />
          <h2 className="text-xl font-bold text-foreground">Order Placed!</h2>
          <p className="text-muted-foreground">Redirecting to dashboard…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="reseller" title="New Order">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setLocation("/reseller")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm font-semibold text-foreground">New Order</span>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Left: Catalog ── */}
        <div className="flex-1 min-w-0">

          {/* Tabs */}
          <div className="flex gap-1 flex-wrap mb-4 bg-muted/20 p-1.5 rounded-xl border border-border/40">
            {tabs.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                  {t.count > 0 && (
                    <span className={`text-[10px] px-1 rounded-full ${active ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>{t.count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search + category filter */}
          {tab !== "domains" && (
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border/60 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              {categories.length > 1 && (
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-border/60 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">All categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
              )}
            </div>
          )}

          {/* Items list */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="w-10 h-10 opacity-20 mb-3" />
                <p className="text-sm">{search || categoryFilter ? "No items match your search" : "No items available"}</p>
              </div>
            ) : filtered.map((item: any) => {
              const inCart = cartQty(item.id, tab as ItemType);
              const { exclVat, inclVat } = vatPrices(item);
              const isVoip = tab === "voip-solutions" || (tab === "services" && isVoipService(item));
              const panelKey = `${tab}:${item.id}`;
              const panelOpen = didPanelKey === panelKey;

              return (
                <div key={item.id}>
                  <motion.div
                    layout
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border bg-card transition-all ${panelOpen ? "border-primary/40 shadow-md shadow-primary/5" : "border-border/50 hover:border-border"}`}
                  >
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {tab === "services" ? <Server className="w-4 h-4 text-primary" /> :
                       tab === "connectivity" ? <Network className="w-4 h-4 text-primary" /> :
                       tab === "products" ? <HardDrive className="w-4 h-4 text-primary" /> :
                       tab === "hosting" ? <Globe className="w-4 h-4 text-primary" /> :
                       tab === "domains" ? <Tag className="w-4 h-4 text-primary" /> :
                       tab === "cybersecurity" ? <Shield className="w-4 h-4 text-primary" /> :
                       tab === "data-security" ? <Lock className="w-4 h-4 text-primary" /> :
                       tab === "web-development" ? <Code className="w-4 h-4 text-primary" /> :
                       <Phone className="w-4 h-4 text-primary" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.categoryName && <span className="text-xs text-muted-foreground">{item.categoryName}</span>}
                        {item.categoryName && exclVat > 0 && <span className="text-muted-foreground/40 text-xs">·</span>}
                        {exclVat > 0 && <span className="text-xs text-muted-foreground">{formatZar(exclVat)} excl VAT</span>}
                      </div>
                    </div>

                    {/* Price + actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-sm text-foreground">
                          {inclVat === 0 ? "Free" : `${formatZar(inclVat)}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {MONTHLY_TYPES.has(tab as ItemType) ? "incl VAT/mo" : "incl VAT"}
                        </p>
                      </div>

                      {inCart > 0 && tab !== "voip-solutions" && tab !== "services" ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(item.id, tab as ItemType, -1)} className="w-7 h-7 rounded-lg bg-muted/40 hover:bg-muted/70 flex items-center justify-center transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold">{inCart}</span>
                          <button onClick={() => updateQty(item.id, tab as ItemType, 1)} className="w-7 h-7 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : isVoip ? (
                        <button
                          onClick={() => {
                            if (!inCart) {
                              const itemType = tab as ItemType;
                              addToCart({ referenceId: item.id, itemType, name: item.name, unitPriceExclVat: exclVat, unitPriceInclVat: inclVat, quantity: 1 });
                            }
                            openDIDPanel(panelKey);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${panelOpen ? "bg-primary text-primary-foreground" : inCart ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                        >
                          {panelOpen ? <X className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                          {panelOpen ? "Close" : inCart ? "Add DID" : "Select DID"}
                        </button>
                      ) : inCart > 0 ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(item.id, tab as ItemType, -1)} className="w-7 h-7 rounded-lg bg-muted/40 hover:bg-muted/70 flex items-center justify-center transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold">{inCart}</span>
                          <button onClick={() => updateQty(item.id, tab as ItemType, 1)} className="w-7 h-7 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart({ referenceId: item.id, itemType: tab as ItemType, name: item.name, unitPriceExclVat: exclVat, unitPriceInclVat: inclVat, quantity: 1 })}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      )}
                    </div>
                  </motion.div>

                  {/* ── DID Panel ── */}
                  <AnimatePresence>
                    {panelOpen && (
                      <motion.div
                        key="did-panel"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mx-2 mb-2 p-4 rounded-b-xl border border-t-0 border-primary/30 bg-primary/5 space-y-4">
                          {/* Step 1: Area code */}
                          <div>
                            <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" /> 1. Select Area Code
                            </p>
                            <div className="relative">
                              <select
                                value={voipAreaCodeId ?? ""}
                                onChange={e => {
                                  setVoipAreaCodeId(e.target.value ? Number(e.target.value) : undefined);
                                  setVoipSelectedDidId(null);
                                }}
                                className="w-full appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-border/60 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                              >
                                <option value="">— choose area code —</option>
                                {(areaCodes as any[]).map((ac: any) => (
                                  <option key={ac.id} value={ac.id}>{ac.code} — {ac.region}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                            </div>
                          </div>

                          {/* Step 2: Phone number */}
                          {voipAreaCodeId && (
                            <div>
                              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" /> 2. Select Number
                                <span className="font-normal text-muted-foreground normal-case ml-1">— Free (R0/mo)</span>
                              </p>
                              {didsLoading ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading available numbers…
                                </div>
                              ) : (availableDids as any[]).length === 0 ? (
                                <p className="text-xs text-muted-foreground py-2">No numbers available for this area code.</p>
                              ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
                                  {(availableDids as Did[]).map((did: any) => (
                                    <button
                                      key={did.id}
                                      onClick={() => setVoipSelectedDidId(did.id === voipSelectedDidId ? null : did.id)}
                                      className={`px-2.5 py-2 rounded-lg border text-xs font-mono font-semibold transition-all ${voipSelectedDidId === did.id ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background border-border/60 text-foreground hover:border-primary/40 hover:bg-primary/5"}`}
                                    >
                                      {did.number}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Step 3: Minute bundle */}
                          {voipSelectedDidId && (
                            <div>
                              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" /> 3. Minute Bundle
                                <span className="font-normal text-muted-foreground normal-case ml-1">— optional</span>
                              </p>
                              {servicesLoading ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading bundles…
                                </div>
                              ) : bundleServices.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No minute bundles configured.</p>
                              ) : (
                                <div className="space-y-1">
                                  {bundleServices.map(b => {
                                    const { exclVat: bExcl, inclVat: bIncl } = vatPrices(b as any);
                                    const sel = voipBundleServiceId === b.id;
                                    return (
                                      <button
                                        key={b.id}
                                        onClick={() => setVoipBundleServiceId(sel ? null : b.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${sel ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-background hover:border-primary/30 hover:bg-primary/5"}`}
                                      >
                                        <span>{b.name}</span>
                                        <div className="flex items-center gap-2 text-xs">
                                          <span className="text-muted-foreground">{formatZar(bExcl)} excl VAT</span>
                                          <span className="font-bold">{formatZar(bIncl)}/mo</span>
                                          {sel && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Confirm button */}
                          {voipSelectedDidId && (
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={confirmDID}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Confirm &amp; Add to Order
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Order Summary ── */}
        <div className="w-full lg:w-[22rem] shrink-0 flex flex-col gap-4 sticky top-6">

          {/* Client */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Client (Optional)
            </p>
            <div className="relative">
              <select
                value={selectedClientId ?? ""}
                onChange={e => setSelectedClientId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-border/60 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">— no client assigned —</option>
                {(clients as any[]).map(c => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Cart items */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/10">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" /> Order Items
              </h3>
              <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            </div>

            <div className="p-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <ShoppingCart className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-xs">No items yet</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {/* Monthly */}
                  {monthlyCart.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground px-1 pt-1">Monthly</p>
                      {monthlyCart.map(item => (
                        <CartRow key={`${item.itemType}-${item.referenceId}`} item={item} onQty={updateQty} onRemove={removeFromCart} />
                      ))}
                    </>
                  )}
                  {/* Once-off */}
                  {onceOffCart.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground px-1 pt-2">Once-off</p>
                      {onceOffCart.map(item => (
                        <CartRow key={`${item.itemType}-${item.referenceId}`} item={item} onQty={updateQty} onRemove={removeFromCart} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Financial breakdown */}
          {!cartIsEmpty && (
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border/50 bg-muted/10 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Price Breakdown</h3>
              </div>

              <div className="p-4 space-y-4">

                {/* Monthly Thereafter */}
                {monthlyCart.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold text-primary uppercase tracking-wide">Monthly Thereafter</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal excl VAT</span>
                        <span>{formatZar(monthly.exclVat)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>VAT (15%)</span>
                        <span>{formatZar(monthly.vat)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-foreground border-t border-border/40 pt-1 mt-1">
                        <span>Total incl VAT</span>
                        <span>{formatZar(monthly.inclVat)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Once-off */}
                {onceOffCart.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Once-off Items</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal excl VAT</span>
                        <span>{formatZar(onceOff.exclVat)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>VAT (15%)</span>
                        <span>{formatZar(onceOff.vat)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-foreground border-t border-border/40 pt-1 mt-1">
                        <span>Total incl VAT</span>
                        <span>{formatZar(onceOff.inclVat)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Due Today */}
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wide">Due Today</span>
                  </div>

                  {monthlyCart.length > 0 && (
                    <div className="text-[10px] text-muted-foreground mb-2 px-0.5">
                      Pro-rata: {pr.daysRemaining} of {pr.daysInMonth} days remaining this month
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    {monthlyCart.length > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Pro-rated monthly excl VAT</span>
                        <span>{formatZar(proRata.exclVat)}</span>
                      </div>
                    )}
                    {onceOffCart.length > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Once-off excl VAT</span>
                        <span>{formatZar(onceOff.exclVat)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground border-t border-border/30 pt-1">
                      <span>Subtotal excl VAT</span>
                      <span>{formatZar(dueToday.exclVat)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>VAT (15%)</span>
                      <span>{formatZar(dueToday.vat)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-foreground text-sm border-t-2 border-primary/30 pt-2 mt-1">
                      <span>Total Due Today</span>
                      <span className="text-primary">{formatZar(dueToday.inclVat)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Notes (optional)</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes or special instructions…"
              className="w-full text-sm rounded-lg border border-border/60 bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={cartIsEmpty || createOrder.isPending}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            {createOrder.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Placing Order…</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Place Order</>
            )}
          </button>

          {cartIsEmpty && (
            <p className="text-center text-xs text-muted-foreground">Add items from the catalog to place an order.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
