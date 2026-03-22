import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useGetCatalogServices,
  useGetCatalogProducts,
  useGetCatalogHostingPackages,
  useGetCatalogDomainTlds,
  useResellerGetAreaCodes,
  useResellerGetAvailableDids,
  useResellerCheckDomain,
  useCreateOrder,
  Service,
  Product,
  Did,
  HostingPackage,
  DomainTld,
} from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Minus, Trash2, ShoppingCart, Server, Package, Phone, CheckCircle2,
  MapPin, Globe, HardDrive, Mail, Database, Shield, Wifi, Search, X, Loader2, Tag, Calendar, User,
  ChevronDown,
} from "lucide-react";
import { formatZar } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface CartItem {
  referenceId: number;
  itemType: "service" | "product" | "did" | "hosting" | "domain";
  name: string;
  sku?: string;
  unitPriceExclVat: number;
  unitPriceInclVat: number;
  quantity: number;
}

type OrderTab = "services" | "products" | "dids" | "hosting" | "domains";

function vatPrices(item: {
  price?: number | null;
  retailPriceExclVat?: number | null;
  priceInclVat?: number | null;
  resellerPriceExclVat?: number | null;
  resellerPriceInclVat?: number | null;
}): { exclVat: number; inclVat: number } {
  const exclVat = Number(item.resellerPriceExclVat ?? item.retailPriceExclVat ?? item.price ?? 0);
  const inclVat = item.resellerPriceExclVat != null
    ? Number(item.resellerPriceInclVat ?? exclVat * 1.15)
    : Number(item.priceInclVat ?? exclVat * 1.15);
  return { exclVat, inclVat };
}

function CartItemRow({
  item,
  onUpdateQty,
  onRemove,
  onRemoveDomain,
}: {
  item: CartItem;
  onUpdateQty: (id: number, type: string, delta: number) => void;
  onRemove: (id: number, type: string) => void;
  onRemoveDomain: (domain: string) => void;
}) {
  const icon = item.itemType === "service" ? <Server className="w-3.5 h-3.5 text-primary" />
    : item.itemType === "did" ? <Phone className="w-3.5 h-3.5 text-primary" />
    : item.itemType === "hosting" ? <Globe className="w-3.5 h-3.5 text-primary" />
    : item.itemType === "domain" ? <Tag className="w-3.5 h-3.5 text-primary" />
    : <Package className="w-3.5 h-3.5 text-primary" />;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/10 border border-border/50">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-xs truncate">{item.name}</p>
        {item.itemType === "domain" ? (
          <p className="text-xs text-muted-foreground">
            {item.unitPriceExclVat > 0 ? `${formatZar(item.unitPriceExclVat)} excl VAT` : "Domain Registration"}
          </p>
        ) : (item.itemType === "service" || item.itemType === "hosting" || item.itemType === "did") ? (
          <p className="text-xs text-muted-foreground">
            {formatZar(item.unitPriceExclVat)} excl VAT × {item.quantity} = <span className="text-foreground font-semibold">{formatZar(item.unitPriceExclVat * item.quantity)}</span>
            <span className="text-muted-foreground/70 ml-1">/month</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {formatZar(item.unitPriceExclVat)} excl VAT × {item.quantity} = <span className="text-foreground font-semibold">{formatZar(item.unitPriceExclVat * item.quantity)}</span>
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {item.itemType !== "did" && item.itemType !== "domain" && (
          <>
            <button onClick={() => onUpdateQty(item.referenceId, item.itemType, -1)} className="w-6 h-6 rounded bg-black/[0.07] hover:bg-black/[0.08] flex items-center justify-center text-muted-foreground transition-colors"><Minus className="w-3 h-3" /></button>
            <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
            <button onClick={() => onUpdateQty(item.referenceId, item.itemType, 1)} className="w-6 h-6 rounded bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors"><Plus className="w-3 h-3" /></button>
          </>
        )}
        <button
          onClick={() => item.itemType === "domain"
            ? onRemoveDomain(item.name.replace("Domain: ", ""))
            : onRemove(item.referenceId, item.itemType)
          }
          className="w-6 h-6 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors ml-1"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function ResellerNewOrder() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const { data: services = [] } = useGetCatalogServices();
  const { data: products = [] } = useGetCatalogProducts();
  const { data: hostingPackages = [] } = useGetCatalogHostingPackages();
  const { data: domainTlds = [] } = useGetCatalogDomainTlds();
  const { data: areaCodes = [] } = useResellerGetAreaCodes();
  const { data: didPricing } = useQuery({
    queryKey: ["reseller-did-pricing"],
    queryFn: async () => {
      const res = await fetch("/api/reseller/did-pricing", { credentials: "include" });
      if (!res.ok) return { exclVat: null, inclVat: null };
      return res.json() as Promise<{ exclVat: number | null; inclVat: number | null }>;
    },
  });
  const didPriceExcl = didPricing?.exclVat ?? 60;
  const didPriceIncl = didPricing?.inclVat ?? (didPriceExcl * 1.15);
  const createOrder = useCreateOrder();

  // Helper: identify services that need a DID (VoIP line / PBX extension)
  function isVoipService(service: Service): boolean {
    const hay = `${service.name} ${(service as any).categoryName ?? ""}`.toLowerCase();
    return /voip|pbx|sip|extension|hosted\s*line|voip\s*line|pbx\s*ext/.test(hay);
  }

  // Helper: identify minute bundle services
  function isBundleService(service: Service): boolean {
    const hay = `${service.name} ${(service as any).categoryName ?? ""}`.toLowerCase();
    return /bundle|minute|minutes|min\s*pack|talk\s*time|talktime|call\s*pack/.test(hay);
  }

  const { data: clients = [] } = useQuery({
    queryKey: ["reseller-clients"],
    queryFn: async () => {
      const res = await fetch("/api/reseller/clients", { credentials: "include" });
      if (!res.ok) return [];
      return res.json() as Promise<Array<{ id: number; companyName: string; contactName: string }>>;
    },
  });

  const params = new URLSearchParams(searchString);
  const prefillTab = params.get("tab") as OrderTab | null;

  const [tab, setTab] = useState<OrderTab>(
    prefillTab && ["services","products","dids","hosting","domains"].includes(prefillTab)
      ? prefillTab
      : "services"
  );
  const [selectedAreaCodeId, setSelectedAreaCodeId] = useState<number | undefined>();
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [prefillApplied, setPrefillApplied] = useState(false);

  // Inline DID + bundle picker for VoIP/PBX services
  const [voipDidPanelServiceId, setVoipDidPanelServiceId] = useState<number | null>(null);
  const [voipAreaCodeId, setVoipAreaCodeId] = useState<number | undefined>();
  const [voipSelectedDidId, setVoipSelectedDidId] = useState<number | null>(null);
  const [voipBundleServiceId, setVoipBundleServiceId] = useState<number | null>(null);

  // Pre-populate cart from ?add=type:id param once catalog data has loaded
  useEffect(() => {
    if (prefillApplied) return;
    const addParam = params.get("add");
    if (!addParam) { setPrefillApplied(true); return; }

    const [type, idStr] = addParam.split(":");
    const id = parseInt(idStr ?? "");
    if (!type || !id) { setPrefillApplied(true); return; }

    if (type === "service" && (services as Service[]).length > 0) {
      const item = (services as Service[]).find(s => s.id === id);
      if (item) {
        const exclVat = Number(item.resellerPriceExclVat ?? item.retailPriceExclVat ?? 0);
        const inclVat = item.resellerPriceExclVat != null
          ? Number(item.resellerPriceInclVat ?? exclVat * 1.15)
          : Number(item.priceInclVat ?? exclVat * 1.15);
        setCart([{ referenceId: id, itemType: "service", name: item.name, unitPriceExclVat: exclVat, unitPriceInclVat: inclVat, quantity: 1 }]);
        setTab("services");
      }
      setPrefillApplied(true);
    } else if (type === "product" && (products as Product[]).length > 0) {
      const item = (products as Product[]).find(p => p.id === id);
      if (item) {
        const exclVat = Number(item.resellerPriceExclVat ?? item.retailPriceExclVat ?? 0);
        const inclVat = item.resellerPriceExclVat != null
          ? Number(item.resellerPriceInclVat ?? exclVat * 1.15)
          : Number(item.priceInclVat ?? exclVat * 1.15);
        setCart([{ referenceId: id, itemType: "product", name: item.name, sku: item.sku ?? undefined, unitPriceExclVat: exclVat, unitPriceInclVat: inclVat, quantity: 1 }]);
        setTab("products");
      }
      setPrefillApplied(true);
    } else if (type === "hosting" && (hostingPackages as HostingPackage[]).length > 0) {
      const item = (hostingPackages as HostingPackage[]).find(h => h.id === id);
      if (item) {
        const exclVat = Number(item.resellerPriceExclVat ?? item.retailPriceExclVat ?? 0);
        const inclVat = item.resellerPriceExclVat != null
          ? Number(item.resellerPriceInclVat ?? exclVat * 1.15)
          : Number(item.priceInclVat ?? exclVat * 1.15);
        setCart([{ referenceId: id, itemType: "hosting", name: item.name, unitPriceExclVat: exclVat, unitPriceInclVat: inclVat, quantity: 1 }]);
        setTab("hosting");
      }
      setPrefillApplied(true);
    } else if (type === "domain" && (domainTlds as DomainTld[]).length > 0) {
      // Domain TLD — just switch to the domains tab; user fills in the actual domain name
      setTab("domains");
      setPrefillApplied(true);
    }
  }, [services, products, hostingPackages, domainTlds, prefillApplied]);

  // Domain checker state
  const [domainInput, setDomainInput] = useState("");
  const [domainQuery, setDomainQuery] = useState("");
  const domainCheckResult = useResellerCheckDomain(
    { domain: domainQuery },
    { query: { enabled: !!domainQuery, staleTime: 30000 } }
  );

  const { data: availableDids = [] } = useResellerGetAvailableDids(
    { areaCodeId: selectedAreaCodeId! },
    { query: { enabled: !!selectedAreaCodeId } }
  );

  // Separate DID fetch for the inline VoIP service DID picker
  const { data: voipAvailableDids = [], isLoading: voipDidsLoading } = useResellerGetAvailableDids(
    { areaCodeId: voipAreaCodeId! },
    { query: { enabled: !!voipAreaCodeId } }
  );

  // Find the TLD price for a given domain name
  const getTldPricing = (domain: string): DomainTld | null => {
    const tldList = (domainTlds as DomainTld[])
      .slice()
      .sort((a, b) => b.tld.length - a.tld.length); // longest match first
    return tldList.find(t => domain.toLowerCase().endsWith(t.tld.toLowerCase())) ?? null;
  };

  const isDomainInCart = (domain: string) =>
    cart.some(c => c.itemType === "domain" && c.name === `Domain: ${domain}`);

  const handleDomainCheck = () => {
    const d = domainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!d || !/^[a-z0-9][a-z0-9\-\.]{1,61}[a-z0-9]\.[a-z]{2,}$/.test(d)) {
      toast({ title: "Please enter a valid domain name (e.g. mycompany.co.za)", variant: "destructive" });
      return;
    }
    setDomainQuery(d);
  };

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      if (item.itemType === "did") {
        if (prev.find(c => c.referenceId === item.referenceId && c.itemType === "did")) return prev;
        return [...prev, { ...item, quantity: 1 }];
      }
      if (item.itemType === "domain") {
        if (prev.find(c => c.itemType === "domain" && c.name === item.name)) return prev;
        return [...prev, { ...item, quantity: 1 }];
      }
      const existing = prev.find(c => c.referenceId === item.referenceId && c.itemType === item.itemType);
      if (existing) {
        return prev.map(c =>
          c.referenceId === item.referenceId && c.itemType === item.itemType
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQty = (referenceId: number, itemType: string, delta: number) => {
    if (itemType === "did" || itemType === "domain") return;
    setCart(prev =>
      prev
        .map(c =>
          c.referenceId === referenceId && c.itemType === itemType
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c
        )
        .filter(c => c.quantity > 0)
    );
  };

  const removeFromCart = (referenceId: number, itemType: string) => {
    setCart(prev => prev.filter(c => !(c.referenceId === referenceId && c.itemType === itemType)));
  };

  const removeDomainFromCart = (domainName: string) => {
    setCart(prev => prev.filter(c => !(c.itemType === "domain" && c.name === `Domain: ${domainName}`)));
  };

  // Excl VAT totals are the source of truth — incl VAT is always exclVat × 1.15
  const dueNowExclVat = cart.filter(c => c.itemType === "product" || c.itemType === "domain").reduce((sum, c) => sum + c.unitPriceExclVat * c.quantity, 0);
  const dueNowVat = dueNowExclVat * 0.15;
  const dueNowInclVat = dueNowExclVat + dueNowVat;

  const monthlyExclVat = cart.filter(c => c.itemType === "service" || c.itemType === "hosting" || c.itemType === "did").reduce((sum, c) => sum + c.unitPriceExclVat * c.quantity, 0);
  const monthlyVat = monthlyExclVat * 0.15;
  const monthlyInclVat = monthlyExclVat + monthlyVat;
  const hasMonthly = monthlyExclVat > 0;

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const remainingDays = daysInMonth - today.getDate() + 1;
  const proRataRatio = remainingDays / daysInMonth;
  const proRataExclVat = monthlyExclVat * proRataRatio;
  const proRataVat = proRataExclVat * 0.15;
  const proRataInclVat = proRataExclVat + proRataVat;

  const totalDueNowExclVat = dueNowExclVat + (hasMonthly ? proRataExclVat : 0);
  const totalDueNowVat = totalDueNowExclVat * 0.15;
  const totalDueNowInclVat = totalDueNowExclVat + totalDueNowVat;
  const hasDueNow = totalDueNowExclVat > 0 || cart.some(c => c.itemType === "domain") || hasMonthly;

  const cartQtyOf = (id: number, type: string) => cart.find(c => c.referenceId === id && c.itemType === type)?.quantity ?? 0;
  const isDidInCart = (id: number) => cart.some(c => c.referenceId === id && c.itemType === "did");

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast({ title: "Add at least one item to place an order", variant: "destructive" });
      return;
    }
    try {
      await createOrder.mutateAsync({
        data: {
          notes: notes || undefined,
          clientId: selectedClientId ?? undefined,
          items: cart.map(c => ({
            itemType: c.itemType,
            referenceId: c.referenceId,
            name: c.name,
            sku: c.sku,
            quantity: c.quantity,
            unitPriceExclVat: c.unitPriceExclVat,
            unitPriceInclVat: c.unitPriceInclVat,
          })),
        } as any,
      });
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Failed to place order";
      toast({ title: msg, variant: "destructive" });
    }
  };

  if (submitted) {
    return (
      <AppLayout role="reseller" title="Order Placed">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.4 }}>
            <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
          </motion.div>
          <h2 className="text-3xl font-display font-bold text-foreground mb-3">Order Submitted!</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">Your order has been received by Black Tie VoIP and is pending review. You'll be notified when it's processed.</p>
          <div className="flex gap-3">
            <button
              onClick={() => { setCart([]); setNotes(""); setSubmitted(false); }}
              className="px-5 py-2.5 rounded-xl font-semibold text-muted-foreground hover:bg-black/5 border border-border transition-colors"
            >
              Place Another Order
            </button>
            <button
              onClick={() => setLocation("/reseller/orders")}
              className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
            >
              View My Orders
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="reseller" title="New Order">
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Left: Catalog browser */}
        <div className="flex-1 flex flex-col bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="p-3 border-b border-border/50 flex items-center gap-2 bg-muted/20 flex-wrap">
            {([
              { id: "services", label: "Services", icon: Server, count: services.length },
              { id: "products", label: "Products", icon: Package, count: products.length },
              { id: "dids", label: "DID Numbers", icon: Phone, count: areaCodes.reduce((s: number, ac: any) => s + (ac.availableCount ?? 0), 0) },
              { id: "hosting", label: "Web Hosting", icon: Globe, count: hostingPackages.length },
              { id: "domains", label: "Domains", icon: Tag, count: domainTlds.length },
            ] as { id: OrderTab; label: string; icon: React.ElementType; count: number }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${tab === t.id ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-black/5"}`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                <span className="opacity-70">({t.count})</span>
              </button>
            ))}
          </div>

          {/* Items */}
          <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(100vh - 220px)" }}>
            <AnimatePresence mode="wait">
              {/* ── Services ── */}
              {tab === "services" ? (
                <motion.div key="services" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-2">
                  {(services as Service[]).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Server className="w-10 h-10 text-muted-foreground/20 mb-3" />
                      <p className="text-muted-foreground text-sm">No services available</p>
                    </div>
                  ) : ([...(services as Service[])].sort((a, b) => {
                      const rank = (s: Service) => {
                        const n = s.name.toLowerCase();
                        if (/single\s*voip\s*line|voip\s*line/.test(n)) return 0;
                        if (/hosted\s*pbx.*ext|pbx.*ext|pbx\s*extension/.test(n)) return 1;
                        return 2;
                      };
                      return rank(a) - rank(b);
                    })).map((service: Service) => {
                    const inCart = cartQtyOf(service.id, "service");
                    const { exclVat, inclVat } = vatPrices(service as any);
                    const needsDid = isVoipService(service);
                    const panelOpen = voipDidPanelServiceId === service.id;
                    return (
                      <div key={service.id} className={`rounded-xl border transition-colors ${panelOpen ? "border-primary/40 bg-primary/5" : "bg-muted/10 border-border/50 hover:border-primary/30"}`}>
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              {needsDid ? <Phone className="w-4 h-4 text-primary" /> : <Server className="w-4 h-4 text-primary" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-foreground text-sm truncate">{service.name}</p>
                                {needsDid && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide">VoIP</span>
                                )}
                              </div>
                              {service.categoryName && <p className="text-xs text-muted-foreground">{service.categoryName}</p>}
                              <p className="text-xs text-primary font-semibold mt-0.5">{formatZar(exclVat)} <span className="text-muted-foreground font-normal">/{service.unit} excl VAT</span></p>
                              <p className="text-[10px] text-muted-foreground/70">{formatZar(inclVat)} incl VAT</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            {inCart > 0 ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => updateQty(service.id, "service", -1)} className="w-7 h-7 rounded-lg bg-black/[0.07] hover:bg-black/[0.08] flex items-center justify-center transition-colors"><Minus className="w-3 h-3" /></button>
                                <span className="w-6 text-center text-sm font-bold text-foreground">{inCart}</span>
                                <button onClick={() => updateQty(service.id, "service", 1)} className="w-7 h-7 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors"><Plus className="w-3 h-3" /></button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  addToCart({ referenceId: service.id, itemType: "service", name: service.name, unitPriceExclVat: exclVat, unitPriceInclVat: inclVat, quantity: 1 });
                                  if (needsDid) {
                                    setVoipDidPanelServiceId(service.id);
                                    setVoipAreaCodeId(undefined);
                                    setVoipSelectedDidId(null);
                                    setVoipBundleServiceId(null);
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add
                              </button>
                            )}
                            {/* Toggle DID picker for VoIP services already in cart */}
                            {needsDid && inCart > 0 && (
                              <button
                                onClick={() => {
                                  setVoipDidPanelServiceId(panelOpen ? null : service.id);
                                  if (!panelOpen) {
                                    setVoipAreaCodeId(undefined);
                                    setVoipSelectedDidId(null);
                                    setVoipBundleServiceId(null);
                                  }
                                }}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${panelOpen ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
                                title={panelOpen ? "Hide DID picker" : "Assign DID number"}
                              >
                                <Phone className="w-3.5 h-3.5" />
                                {panelOpen ? "Close" : "Pick DID"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline DID + Bundle picker panel */}
                        <AnimatePresence>
                          {needsDid && panelOpen && (() => {
                            const bundleServices = (services as Service[]).filter(isBundleService);
                            const selectedDid = voipSelectedDidId
                              ? (voipAvailableDids as Did[]).find((d: Did) => d.id === voipSelectedDidId) ?? null
                              : null;
                            const selectedBundle = voipBundleServiceId
                              ? bundleServices.find(s => s.id === voipBundleServiceId) ?? null
                              : null;
                            const canConfirm = !!voipSelectedDidId && !!voipBundleServiceId;
                            return (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden border-t border-primary/20"
                              >
                                <div className="p-4 space-y-4 bg-background/50">

                                  {/* Step indicators */}
                                  <div className="flex items-center gap-2 text-xs font-semibold">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${voipSelectedDidId ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"}`}>
                                      {voipSelectedDidId ? "✓" : "1"}
                                    </span>
                                    <span className={voipSelectedDidId ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}>Choose DID Number</span>
                                    <div className="flex-1 h-px bg-border/60" />
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${voipBundleServiceId ? "bg-emerald-500 text-white" : voipSelectedDidId ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                      {voipBundleServiceId ? "✓" : "2"}
                                    </span>
                                    <span className={voipBundleServiceId ? "text-emerald-600 dark:text-emerald-400" : voipSelectedDidId ? "text-foreground" : "text-muted-foreground"}>Minute Bundle</span>
                                  </div>

                                  {/* ── Step 1: DID picker ── */}
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5 text-primary" /> Select Area Code &amp; DID Number
                                    </p>

                                    {/* Area code dropdown */}
                                    <div className="relative">
                                      <select
                                        value={voipAreaCodeId ?? ""}
                                        onChange={e => {
                                          setVoipAreaCodeId(e.target.value ? parseInt(e.target.value) : undefined);
                                          setVoipSelectedDidId(null);
                                        }}
                                        className="w-full pl-3 pr-8 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer"
                                      >
                                        <option value="">Select area code…</option>
                                        {(areaCodes as any[]).map((ac: any) => (
                                          <option key={ac.id} value={ac.id} disabled={ac.availableCount === 0}>
                                            {ac.code} — {ac.region}{ac.province ? `, ${ac.province}` : ""} ({ac.availableCount} available)
                                          </option>
                                        ))}
                                      </select>
                                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    </div>

                                    {/* DID list */}
                                    {!voipAreaCodeId ? (
                                      <p className="text-xs text-muted-foreground text-center py-3">Select an area code to see available numbers</p>
                                    ) : voipDidsLoading ? (
                                      <div className="flex items-center justify-center py-5">
                                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                      </div>
                                    ) : (voipAvailableDids as Did[]).length === 0 ? (
                                      <p className="text-xs text-muted-foreground text-center py-3">No available DIDs in this area code</p>
                                    ) : (
                                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                                        {(voipAvailableDids as Did[]).map((did: Did) => {
                                          const selected = voipSelectedDidId === did.id;
                                          return (
                                            <button
                                              key={did.id}
                                              onClick={() => setVoipSelectedDidId(selected ? null : did.id)}
                                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-left ${selected ? "border-primary bg-primary/10 shadow-sm" : "bg-card border-border/60 hover:border-primary/40"}`}
                                            >
                                              <div className="flex items-center gap-2.5">
                                                <Phone className={`w-3.5 h-3.5 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                                                <div>
                                                  <p className={`font-mono font-semibold text-sm tracking-wider ${selected ? "text-primary" : "text-foreground"}`}>{did.number}</p>
                                                  <p className="text-[10px] text-muted-foreground">{did.areaCode} — {did.region}</p>
                                                </div>
                                              </div>
                                              {selected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>

                                  {/* ── Step 2: Minute Bundle (shown after DID selected) ── */}
                                  <AnimatePresence>
                                    {voipSelectedDidId && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="space-y-2 pt-1 border-t border-border/50">
                                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 pt-3">
                                            <Phone className="w-3.5 h-3.5 text-primary" /> Minute Bundle <span className="text-destructive">*</span>
                                          </p>

                                          {bundleServices.length === 0 ? (
                                            <div className="px-3 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                                              No minute bundle services found. Add services with "bundle" or "minutes" in the name or category to the catalog first.
                                            </div>
                                          ) : (
                                            <div className="relative">
                                              <select
                                                value={voipBundleServiceId ?? ""}
                                                onChange={e => setVoipBundleServiceId(e.target.value ? parseInt(e.target.value) : null)}
                                                className="w-full pl-3 pr-8 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer"
                                              >
                                                <option value="">Select a minute bundle…</option>
                                                {bundleServices.map(b => {
                                                  const { inclVat } = vatPrices(b as any);
                                                  return (
                                                    <option key={b.id} value={b.id}>
                                                      {b.name}{(b as any).categoryName ? ` — ${(b as any).categoryName}` : ""} · {inclVat > 0 ? `R${inclVat.toFixed(2)}/month incl VAT` : ""}
                                                    </option>
                                                  );
                                                })}
                                              </select>
                                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                            </div>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>

                                  {/* ── Confirm button ── */}
                                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                                    <div className="text-xs text-muted-foreground">
                                      {selectedDid && <span className="font-semibold text-foreground">{selectedDid.number}</span>}
                                      {selectedDid && selectedBundle && <span className="mx-1">+</span>}
                                      {selectedBundle && <span className="font-semibold text-foreground">{selectedBundle.name}</span>}
                                      {!selectedDid && <span>Select DID and bundle to continue</span>}
                                      {selectedDid && !selectedBundle && <span> — now select a minute bundle</span>}
                                    </div>
                                    <button
                                      disabled={!canConfirm}
                                      onClick={() => {
                                        if (!voipSelectedDidId || !voipBundleServiceId) return;
                                        const did = (voipAvailableDids as Did[]).find((d: Did) => d.id === voipSelectedDidId);
                                        const bundle = bundleServices.find(s => s.id === voipBundleServiceId);
                                        if (did) addToCart({ referenceId: did.id, itemType: "did", name: `DID ${did.number}`, unitPriceExclVat: didPriceExcl, unitPriceInclVat: didPriceIncl, quantity: 1 });
                                        if (bundle) {
                                          const { exclVat: bExcl, inclVat: bIncl } = vatPrices(bundle as any);
                                          addToCart({ referenceId: bundle.id, itemType: "service", name: bundle.name, unitPriceExclVat: bExcl, unitPriceInclVat: bIncl, quantity: 1 });
                                        }
                                        setVoipDidPanelServiceId(null);
                                        setVoipSelectedDidId(null);
                                        setVoipBundleServiceId(null);
                                        setVoipAreaCodeId(undefined);
                                      }}
                                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ml-3"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Add to Order
                                    </button>
                                  </div>

                                </div>
                              </motion.div>
                            );
                          })()}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </motion.div>

              ) : tab === "products" ? (
                /* ── Products ── */
                <motion.div key="products" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-2">
                  {(products as Product[]).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Package className="w-10 h-10 text-muted-foreground/20 mb-3" />
                      <p className="text-muted-foreground text-sm">No products available</p>
                    </div>
                  ) : (products as Product[]).map((product: Product) => {
                    const inCart = cartQtyOf(product.id, "product");
                    const { exclVat, inclVat } = vatPrices(product as any);
                    return (
                      <div key={product.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/10 border border-border/50 hover:border-primary/30 transition-colors">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"><Package className="w-4 h-4 text-primary" /></div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">{product.name}</p>
                            <div className="flex items-center gap-2">
                              {product.categoryName && <p className="text-xs text-muted-foreground">{product.categoryName}</p>}
                              {product.sku && <p className="text-xs font-mono text-muted-foreground/60">{product.sku}</p>}
                            </div>
                            <p className="text-xs text-primary font-semibold mt-0.5">{formatZar(inclVat)} <span className="text-muted-foreground font-normal">incl VAT</span></p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          {inCart > 0 ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => updateQty(product.id, "product", -1)} className="w-7 h-7 rounded-lg bg-black/[0.07] hover:bg-black/[0.08] flex items-center justify-center transition-colors"><Minus className="w-3 h-3" /></button>
                              <span className="w-6 text-center text-sm font-bold text-foreground">{inCart}</span>
                              <button onClick={() => updateQty(product.id, "product", 1)} className="w-7 h-7 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors"><Plus className="w-3 h-3" /></button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart({ referenceId: product.id, itemType: "product", name: product.name, sku: product.sku ?? undefined, unitPriceExclVat: exclVat, unitPriceInclVat: inclVat, quantity: 1 })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                              <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>

              ) : tab === "dids" ? (
                /* ── DIDs ── */
                <motion.div key="dids" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/10 border border-border/50">
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                    <select
                      value={selectedAreaCodeId ?? ""}
                      onChange={e => setSelectedAreaCodeId(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none appearance-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Select an area code…</option>
                      {(areaCodes as any[]).map((ac: any) => (
                        <option key={ac.id} value={ac.id}>{ac.code} — {ac.region} ({ac.availableCount} available)</option>
                      ))}
                    </select>
                  </div>
                  {!selectedAreaCodeId ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Phone className="w-10 h-10 text-muted-foreground/20 mb-3" />
                      <p className="text-muted-foreground text-sm">Select an area code to browse available DIDs</p>
                    </div>
                  ) : availableDids.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Phone className="w-10 h-10 text-muted-foreground/20 mb-3" />
                      <p className="text-muted-foreground text-sm">No available DIDs in this area code</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(availableDids as Did[]).map((did: Did) => {
                        const inCart = isDidInCart(did.id);
                        return (
                          <div key={did.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/10 border border-border/50 hover:border-primary/30 transition-colors">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Phone className="w-4 h-4 text-primary" /></div>
                              <div>
                                <p className="font-mono font-semibold text-foreground text-sm tracking-wider">{did.number}</p>
                                <p className="text-xs text-muted-foreground">{did.areaCode} — {did.region}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                              <div className="text-right mr-1">
                                <p className="text-xs font-semibold text-primary">{formatZar(didPriceIncl)}</p>
                                <p className="text-xs text-muted-foreground">/month incl VAT</p>
                              </div>
                              {inCart ? (
                                <button onClick={() => removeFromCart(did.id, "did")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" /> Remove
                                </button>
                              ) : (
                                <button onClick={() => addToCart({ referenceId: did.id, itemType: "did", name: `DID ${did.number}`, unitPriceExclVat: didPriceExcl, unitPriceInclVat: didPriceIncl, quantity: 1 })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                                  <Plus className="w-3.5 h-3.5" /> Add to Order
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>

              ) : tab === "hosting" ? (
                /* ── Web Hosting ── */
                <motion.div key="hosting" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-2">
                  {hostingPackages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Globe className="w-10 h-10 text-muted-foreground/20 mb-3" />
                      <p className="text-muted-foreground text-sm">No hosting packages available</p>
                    </div>
                  ) : (hostingPackages as HostingPackage[]).map((pkg: HostingPackage) => {
                    const inCart = cartQtyOf(pkg.id, "hosting");
                    const { exclVat, inclVat } = vatPrices(pkg as any);
                    return (
                      <div key={pkg.id} className="p-4 rounded-xl bg-muted/10 border border-border/50 hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"><Globe className="w-4 h-4 text-primary" /></div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground text-sm">{pkg.name}</p>
                              {pkg.description && <p className="text-xs text-muted-foreground mt-0.5">{pkg.description}</p>}
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><HardDrive className="w-3 h-3 text-primary/60" />{pkg.diskSpaceGb}GB</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><Wifi className="w-3 h-3 text-primary/60" />{pkg.bandwidthGb}GB BW</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3 text-primary/60" />{pkg.emailAccounts} Email</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><Database className="w-3 h-3 text-primary/60" />{pkg.databases} DB</span>
                                {pkg.sslIncluded && <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Shield className="w-3 h-3" />SSL</span>}
                              </div>
                              <p className="text-xs text-primary font-semibold mt-1">{formatZar(inclVat)} <span className="text-muted-foreground font-normal">/month incl VAT</span></p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {inCart > 0 ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => updateQty(pkg.id, "hosting", -1)} className="w-7 h-7 rounded-lg bg-black/[0.07] hover:bg-black/[0.08] flex items-center justify-center transition-colors"><Minus className="w-3 h-3" /></button>
                                <span className="w-6 text-center text-sm font-bold text-foreground">{inCart}</span>
                                <button onClick={() => updateQty(pkg.id, "hosting", 1)} className="w-7 h-7 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors"><Plus className="w-3 h-3" /></button>
                              </div>
                            ) : (
                              <button onClick={() => addToCart({ referenceId: pkg.id, itemType: "hosting", name: pkg.name, unitPriceExclVat: exclVat, unitPriceInclVat: inclVat, quantity: 1 })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                                <Plus className="w-3.5 h-3.5" /> Add
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>

              ) : (
                /* ── Domains ── */
                <motion.div key="domains" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-5">

                  {/* Domain availability checker */}
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Search className="w-4 h-4 text-primary" /> Check Domain Availability
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={domainInput}
                        onChange={e => { setDomainInput(e.target.value); if (domainQuery !== e.target.value.trim()) setDomainQuery(""); }}
                        onKeyDown={e => e.key === "Enter" && handleDomainCheck()}
                        placeholder="e.g. mycompany.co.za"
                        className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/50 outline-none font-mono"
                      />
                      <button
                        onClick={handleDomainCheck}
                        disabled={domainCheckResult.isFetching}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
                      >
                        {domainCheckResult.isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Check
                      </button>
                    </div>

                    {domainCheckResult.isFetching && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" /> Checking availability…
                      </div>
                    )}

                    {domainQuery && !domainCheckResult.isFetching && domainCheckResult.data && (() => {
                      const tldMatch = getTldPricing(domainCheckResult.data.domain);
                      const { exclVat: domainPriceExcl, inclVat: domainPrice } = vatPrices(tldMatch ?? { price: 0 });
                      const inCart = isDomainInCart(domainCheckResult.data.domain);
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`mt-3 p-4 rounded-xl border ${domainCheckResult.data.available ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800" : "border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-mono font-bold text-sm text-foreground">{domainCheckResult.data.domain}</p>
                              {domainCheckResult.data.available ? (
                                <div>
                                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">✓ Available for registration</p>
                                  {tldMatch ? (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Registration: <span className="font-semibold text-foreground">{formatZar(domainPrice)}</span> incl VAT
                                      {tldMatch.registrationYears > 1 && ` / ${tldMatch.registrationYears} years`}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-muted-foreground mt-1">Pricing on request</p>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-0.5">✗ Already registered</p>
                                  {domainCheckResult.data.registrar && <p className="text-xs text-muted-foreground mt-1">Registrar: {domainCheckResult.data.registrar}</p>}
                                  {domainCheckResult.data.expiresAt && <p className="text-xs text-muted-foreground">Expires: {new Date(domainCheckResult.data.expiresAt).toLocaleDateString()}</p>}
                                </div>
                              )}
                            </div>
                            {domainCheckResult.data.available && (
                              inCart ? (
                                <button
                                  onClick={() => removeDomainFromCart(domainCheckResult.data!.domain)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors flex-shrink-0"
                                >
                                  <X className="w-3.5 h-3.5" /> Remove
                                </button>
                              ) : (
                                <button
                                  onClick={() => addToCart({
                                    referenceId: tldMatch?.id ?? 0,
                                    itemType: "domain",
                                    name: `Domain: ${domainCheckResult.data!.domain}`,
                                    unitPriceExclVat: domainPriceExcl,
                                    unitPriceInclVat: domainPrice,
                                    quantity: 1,
                                  })}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors flex-shrink-0"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Add to Order
                                </button>
                              )
                            )}
                          </div>
                        </motion.div>
                      );
                    })()}
                  </div>

                  {/* TLD pricing table */}
                  {domainTlds.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Available Domain Extensions</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(domainTlds as DomainTld[]).map((tld: DomainTld) => {
                          const price = tld.resellerPriceInclVat ?? tld.priceInclVat ?? 0;
                          return (
                            <div
                              key={tld.id}
                              className="p-3 rounded-xl bg-muted/10 border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                              onClick={() => {
                                if (!domainInput.includes(".")) return;
                                const domain = domainInput.trim().toLowerCase();
                                if (domain.endsWith(tld.tld.toLowerCase())) {
                                  handleDomainCheck();
                                } else {
                                  const base = domain.split(".")[0] || "example";
                                  setDomainInput(`${base}${tld.tld}`);
                                  setDomainQuery("");
                                }
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-primary text-sm">{tld.tld}</span>
                                <span className="text-xs font-semibold text-foreground">{formatZar(price)}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {tld.registrationYears} yr
                                {tld.description && <span className="truncate ml-1 text-muted-foreground/60">{tld.description}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-full lg:w-96 flex flex-col bg-card border border-border rounded-2xl shadow-lg sticky top-6">
          <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20 rounded-t-2xl">
            <h3 className="font-display font-bold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Order Summary
            </h3>
            <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
              {cart.reduce((s, c) => s + c.quantity, 0)} items
            </span>
          </div>

          <div className="p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingCart className="w-10 h-10 text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground text-sm">Your order is empty</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Browse the catalog to add items</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Monthly Recurring group */}
                {cart.filter(i => i.itemType === "service" || i.itemType === "hosting" || i.itemType === "did").length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-full border border-primary/20">
                        <Calendar className="w-3 h-3 text-primary" />
                        <span className="text-xs font-bold text-primary uppercase tracking-wide">Monthly Recurring</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {cart.filter(i => i.itemType === "service" || i.itemType === "hosting" || i.itemType === "did").map(item => (
                        <CartItemRow
                          key={`${item.itemType}-${item.referenceId}-${item.name}`}
                          item={item}
                          onUpdateQty={updateQty}
                          onRemove={removeFromCart}
                          onRemoveDomain={removeDomainFromCart}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Once-Off / Due Now group */}
                {cart.filter(i => i.itemType === "product" || i.itemType === "domain").length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/40 rounded-full border border-border/60">
                        <Package className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Once-Off / Due Now</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {cart.filter(i => i.itemType === "product" || i.itemType === "domain").map(item => (
                        <CartItemRow
                          key={`${item.itemType}-${item.referenceId}-${item.name}`}
                          item={item}
                          onUpdateQty={updateQty}
                          onRemove={removeFromCart}
                          onRemoveDomain={removeDomainFromCart}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Totals + Notes + Submit */}
          <div className="p-4 border-t border-border/50 space-y-4 bg-muted/10">
            {cart.length > 0 && (
              <div className="space-y-3 text-sm">
                {hasDueNow && (
                  <div className="rounded-xl border border-border/60 bg-background overflow-hidden">
                    <div className="px-3 py-2 bg-muted/30 border-b border-border/40 flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Due Now</span>
                      <span className="text-xs text-muted-foreground/60">(first payment)</span>
                    </div>
                    <div className="px-3 py-2.5 space-y-1.5">
                      {dueNowExclVat > 0 && (
                        <div className="flex justify-between text-muted-foreground text-xs pb-1 border-b border-border/30">
                          <span>Once-off items excl VAT</span>
                          <span className="font-medium text-foreground">{formatZar(dueNowExclVat)}</span>
                        </div>
                      )}
                      {hasMonthly && (
                        <div className="flex justify-between text-muted-foreground text-xs pb-1 border-b border-border/30">
                          <span>Pro-rata Month 1 excl VAT <span className="text-muted-foreground/60">({remainingDays}/{daysInMonth} days)</span></span>
                          <span className="font-medium text-foreground">{formatZar(proRataExclVat)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal excl VAT</span>
                        <span className="font-medium text-foreground">{formatZar(totalDueNowExclVat)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>VAT (15%)</span>
                        <span className="font-medium text-foreground">{formatZar(totalDueNowVat)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm border-t border-border/40 pt-1.5">
                        <span>Total Due Now incl VAT</span>
                        <span className="text-foreground">{formatZar(totalDueNowInclVat)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {hasMonthly && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 overflow-hidden">
                    <div className="px-3 py-2 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-primary">Monthly Recurring</span>
                      <span className="text-xs text-primary/60">(per month)</span>
                    </div>
                    <div className="px-3 py-2.5 space-y-1.5">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal excl VAT</span>
                        <span className="font-medium text-foreground">{formatZar(monthlyExclVat)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>VAT (15%)</span>
                        <span className="font-medium text-foreground">{formatZar(monthlyVat)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm border-t border-primary/20 pt-1.5">
                        <span>Total / Month incl VAT</span>
                        <span className="text-primary">{formatZar(monthlyInclVat)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {hasMonthly && (
                  <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 space-y-1 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>First payment (pro-rata + once-off)</span>
                      <span className="font-bold text-foreground">{formatZar(totalDueNowInclVat)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Then monthly from month 2</span>
                      <span className="font-bold text-primary">{formatZar(monthlyInclVat)}/mo</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {clients.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Assign to Client <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <select
                  value={selectedClientId ?? ""}
                  onChange={e => setSelectedClientId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none text-foreground"
                >
                  <option value="">— No client —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName} ({c.contactName})</option>
                  ))}
                </select>
              </div>
            )}

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Order notes (optional)…"
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none text-foreground placeholder:text-muted-foreground"
            />

            <button
              onClick={handleSubmit}
              disabled={cart.length === 0 || createOrder.isPending}
              className="w-full py-3 rounded-xl font-bold text-sm bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {createOrder.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Placing Order…</>
              ) : (
                <><ShoppingCart className="w-4 h-4" /> Place Order</>
              )}
            </button>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
