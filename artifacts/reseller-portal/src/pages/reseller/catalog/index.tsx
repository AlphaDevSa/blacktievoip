import { useState, useRef } from "react";
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
  Service,
  Product,
  HostingPackage,
  DomainTld,
  ConnectivityItem,
} from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Server, Package, Search, Globe, HardDrive, Mail, Database, Shield, Wifi, Tag, Calendar, CheckCircle2, XCircle, AlertCircle, ShoppingCart, Network, Lock, Phone, Store } from "lucide-react";
import { formatZar } from "@/lib/utils";
import { useLocation } from "wouter";

type DomainCheckResult = {
  domain: string;
  available: boolean;
  status: "available" | "registered" | "unknown";
  nameservers?: string[];
};

type Tab = "services" | "products" | "hosting" | "domains" | "connectivity" | "cybersecurity" | "data-security" | "web-development" | "voip-solutions";

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

export default function ResellerCatalog() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("services");
  const [search, setSearch] = useState("");

  const [domainQuery, setDomainQuery] = useState("");
  const [domainChecking, setDomainChecking] = useState(false);
  const [domainResult, setDomainResult] = useState<DomainCheckResult | null>(null);
  const domainInputRef = useRef<HTMLInputElement>(null);

  function orderItem(type: "service" | "product" | "hosting" | "domain", id: number) {
    setLocation(`/reseller/orders/new?add=${type}:${id}`);
  }

  function orderDomainTld(tldId: number) {
    setLocation(`/reseller/orders/new?add=domain:${tldId}&tab=domains`);
  }

  const POLL = { query: { refetchInterval: 60_000, staleTime: 0 } } as const;
  const { data: services = [], isLoading: loadingS } = useGetCatalogServices(POLL);
  const { data: products = [], isLoading: loadingP } = useGetCatalogProducts(POLL);
  const { data: hostingPackages = [], isLoading: loadingH } = useGetCatalogHostingPackages(POLL);
  const { data: domainTlds = [], isLoading: loadingD } = useGetCatalogDomainTlds(POLL);
  const { data: connectivityItems = [], isLoading: loadingC } = useGetCatalogConnectivity(POLL);
  const { data: cybersecurityItems = [], isLoading: loadingCyber } = useGetCatalogCybersecurity(POLL);
  const { data: dataSecurityItems = [], isLoading: loadingDS } = useGetCatalogDataSecurity(POLL);
  const { data: webDevItems = [], isLoading: loadingWD } = useGetCatalogWebDevelopment(POLL);
  const { data: voipItems = [], isLoading: loadingVoip } = useGetCatalogVoipSolutions(POLL);

  async function handleDomainCheck(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = domainQuery.trim().toLowerCase();
    if (!trimmed) return;
    setDomainChecking(true);
    setDomainResult(null);
    try {
      const res = await fetch(`/api/reseller/check-domain?domain=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        setDomainResult({ domain: trimmed, available: false, status: "unknown" });
      } else {
        setDomainResult(await res.json());
      }
    } catch {
      setDomainResult({ domain: trimmed, available: false, status: "unknown" });
    } finally {
      setDomainChecking(false);
    }
  }

  const filteredServices = (services as Service[]).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredProducts = (products as Product[]).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredHosting = (hostingPackages as HostingPackage[]).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredDomains = (domainTlds as DomainTld[]).filter(t =>
    t.tld.toLowerCase().includes(search.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredConnectivity = (connectivityItems as ConnectivityItem[]).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase())) ||
    (c.provider && c.provider.toLowerCase().includes(search.toLowerCase())) ||
    (c.speed && c.speed.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredCybersecurity = (cybersecurityItems as Service[]).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredDataSecurity = (dataSecurityItems as Service[]).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredWebDev = (webDevItems as Service[]).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredVoip = (voipItems as Service[]).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );

  const tabs: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: "services",        label: "Services",        icon: Server,  count: services.length },
    { id: "connectivity",    label: "Connectivity",    icon: Network, count: connectivityItems.length },
    { id: "products",        label: "Hardware",        icon: Package, count: products.length },
    { id: "hosting",         label: "Web Hosting",     icon: Globe,   count: hostingPackages.length },
    { id: "domains",         label: "Domains",         icon: Tag,     count: domainTlds.length },
    { id: "cybersecurity",   label: "Cybersecurity",   icon: Shield,  count: cybersecurityItems.length },
    { id: "data-security",   label: "Data Security",   icon: Lock,    count: dataSecurityItems.length },
    { id: "web-development", label: "Web Development", icon: Globe,   count: webDevItems.length },
    { id: "voip-solutions",  label: "VoIP Solutions",  icon: Phone,   count: voipItems.length },
  ];

  const activeTabDef = tabs.find(t => t.id === activeTab)!;

  const isLoading = activeTab === "services"        ? loadingS
    : activeTab === "products"        ? loadingP
    : activeTab === "hosting"         ? loadingH
    : activeTab === "connectivity"    ? loadingC
    : activeTab === "cybersecurity"   ? loadingCyber
    : activeTab === "data-security"   ? loadingDS
    : activeTab === "web-development" ? loadingWD
    : activeTab === "voip-solutions"  ? loadingVoip
    : loadingD;

  return (
    <AppLayout role="reseller" title="Product & Service Catalog">
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <div className="w-full lg:w-56 flex flex-col bg-card border border-border rounded-2xl shadow-lg overflow-hidden shrink-0">
          {/* Header */}
          <div className="p-3 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Store className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">Catalog</span>
            </div>
          </div>

          {/* Nav list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearch(""); }}
                className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <tab.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Content panel ───────────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-card border border-border rounded-2xl shadow-lg overflow-hidden min-w-0">

          {/* Panel header */}
          <div className="p-4 border-b border-border/50 flex items-center justify-between gap-4 bg-muted/20 shrink-0">
            <h3 className="font-display font-bold flex items-center gap-2 text-lg">
              <activeTabDef.icon className="w-5 h-5 text-primary" />
              {activeTabDef.label}
              <span className="text-xs font-normal text-muted-foreground">({activeTabDef.count})</span>
            </h3>
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${activeTabDef.label.toLowerCase()}…`}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/30 outline-none transition-all"
              />
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>

            ) : activeTab === "services" ? (
              filteredServices.length === 0 ? (
                <EmptyState icon={Server} label="No services found" />
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredServices.map((service: Service, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                      key={service.id}
                      className="bg-background border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all flex flex-col h-full"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Server className="w-4 h-4" /></div>
                        <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 bg-muted/50 rounded-full">{service.categoryName || "Service"}</span>
                      </div>
                      <h3 className="font-display font-bold text-foreground mb-1.5">{service.name}</h3>
                      <p className="text-xs text-muted-foreground flex-1 mb-4 line-clamp-2">{service.description || "No description provided."}</p>
                      {(() => {
                        const { inclVat } = vatPrices(service as any);
                        return (
                          <div className="pt-3 border-t border-border mt-auto">
                            <div className="flex items-baseline justify-between mb-2.5">
                              <span className="text-xs text-muted-foreground">per {service.unit} incl VAT</span>
                              <span className="text-xl font-bold text-foreground">{formatZar(inclVat)}</span>
                            </div>
                            <button onClick={() => orderItem("service", service.id)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 transition-all">
                              <ShoppingCart className="w-3.5 h-3.5" /> Order
                            </button>
                          </div>
                        );
                      })()}
                    </motion.div>
                  ))}
                </div>
              )

            ) : activeTab === "products" ? (
              filteredProducts.length === 0 ? (
                <EmptyState icon={Package} label="No products found" />
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredProducts.map((product: Product, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                      key={product.id}
                      className="bg-background border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all flex flex-col h-full"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><Package className="w-4 h-4" /></div>
                        <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 bg-muted/50 rounded-full">{product.categoryName || "Hardware"}</span>
                      </div>
                      <h3 className="font-display font-bold text-foreground mb-0.5">{product.name}</h3>
                      {product.sku && <p className="text-[10px] font-mono text-muted-foreground mb-2">SKU: {product.sku}</p>}
                      <p className="text-xs text-muted-foreground flex-1 mb-4 line-clamp-2">{product.description || "No description provided."}</p>
                      {(() => {
                        const { inclVat } = vatPrices(product as any);
                        return (
                          <div className="pt-3 border-t border-border mt-auto">
                            <div className="flex items-center justify-between mb-2.5">
                              <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${product.stockCount > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-400"}`}>
                                {product.stockCount > 0 ? "In Stock" : "Out of Stock"}
                              </div>
                              <span className="text-xl font-bold text-foreground">{formatZar(inclVat)}</span>
                            </div>
                            <button onClick={() => orderItem("product", product.id)} disabled={product.stockCount === 0} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                              <ShoppingCart className="w-3.5 h-3.5" /> {product.stockCount > 0 ? "Order" : "Out of Stock"}
                            </button>
                          </div>
                        );
                      })()}
                    </motion.div>
                  ))}
                </div>
              )

            ) : activeTab === "hosting" ? (
              filteredHosting.length === 0 ? (
                <EmptyState icon={Globe} label="No hosting packages available" />
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredHosting.map((pkg: HostingPackage, idx) => {
                    const { inclVat: price } = vatPrices(pkg as any);
                    return (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} key={pkg.id} className="bg-background border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all flex flex-col h-full">
                        <div className="flex justify-between items-start mb-3">
                          <div className="p-2 bg-primary/10 text-primary rounded-lg"><Globe className="w-4 h-4" /></div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pkg.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>{pkg.status}</span>
                        </div>
                        <h3 className="font-display font-bold text-foreground mb-1">{pkg.name}</h3>
                        {pkg.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{pkg.description}</p>}
                        <div className="grid grid-cols-2 gap-1.5 mb-3 flex-1">
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><HardDrive className="w-3 h-3 text-primary/60" />{pkg.diskSpaceGb} GB Disk</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Wifi className="w-3 h-3 text-primary/60" />{pkg.bandwidthGb} GB BW</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Mail className="w-3 h-3 text-primary/60" />{pkg.emailAccounts} Email</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Database className="w-3 h-3 text-primary/60" />{pkg.databases} DB</div>
                          {pkg.sslIncluded && <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 col-span-2"><Shield className="w-3 h-3" />SSL Included</div>}
                        </div>
                        <div className="pt-3 border-t border-border mt-auto">
                          <div className="flex items-baseline justify-between mb-2.5"><span className="text-xs text-muted-foreground">per month incl VAT</span><span className="text-xl font-bold text-primary">{formatZar(price)}</span></div>
                          <button onClick={() => orderItem("hosting", pkg.id)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 transition-all"><ShoppingCart className="w-3.5 h-3.5" /> Order</button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )

            ) : activeTab === "cybersecurity" ? (
              filteredCybersecurity.length === 0 ? (
                <EmptyState icon={Shield} label="No cybersecurity items available" />
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredCybersecurity.map((item: Service, idx) => {
                    const { inclVat } = vatPrices(item as any);
                    return (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} key={item.id} className="bg-background border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all flex flex-col h-full">
                        <div className="flex justify-between items-start mb-3"><div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Shield className="w-4 h-4" /></div><span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 bg-muted/50 rounded-full">{(item as any).categoryName || "Cybersecurity"}</span></div>
                        <h3 className="font-display font-bold text-foreground mb-1.5">{item.name}</h3>
                        <p className="text-xs text-muted-foreground flex-1 mb-4 line-clamp-2">{item.description || "No description provided."}</p>
                        <div className="pt-3 border-t border-border mt-auto"><div className="flex items-baseline justify-between"><span className="text-xs text-muted-foreground">per {item.unit} incl VAT</span><span className="text-xl font-bold text-foreground">{formatZar(inclVat)}</span></div></div>
                      </motion.div>
                    );
                  })}
                </div>
              )

            ) : activeTab === "data-security" ? (
              filteredDataSecurity.length === 0 ? (
                <EmptyState icon={Lock} label="No data security items available" />
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredDataSecurity.map((item: Service, idx) => {
                    const { inclVat } = vatPrices(item as any);
                    return (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} key={item.id} className="bg-background border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all flex flex-col h-full">
                        <div className="flex justify-between items-start mb-3"><div className="p-2 bg-violet-500/10 text-violet-400 rounded-lg"><Lock className="w-4 h-4" /></div><span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 bg-muted/50 rounded-full">{(item as any).categoryName || "Data Security"}</span></div>
                        <h3 className="font-display font-bold text-foreground mb-1.5">{item.name}</h3>
                        <p className="text-xs text-muted-foreground flex-1 mb-4 line-clamp-2">{item.description || "No description provided."}</p>
                        <div className="pt-3 border-t border-border mt-auto"><div className="flex items-baseline justify-between"><span className="text-xs text-muted-foreground">per {item.unit} incl VAT</span><span className="text-xl font-bold text-foreground">{formatZar(inclVat)}</span></div></div>
                      </motion.div>
                    );
                  })}
                </div>
              )

            ) : activeTab === "web-development" ? (
              filteredWebDev.length === 0 ? (
                <EmptyState icon={Globe} label="No web development items available" />
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredWebDev.map((item: Service, idx) => {
                    const { inclVat } = vatPrices(item as any);
                    return (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} key={item.id} className="bg-background border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all flex flex-col h-full">
                        <div className="flex justify-between items-start mb-3"><div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><Globe className="w-4 h-4" /></div><span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 bg-muted/50 rounded-full">{(item as any).categoryName || "Web Development"}</span></div>
                        <h3 className="font-display font-bold text-foreground mb-1.5">{item.name}</h3>
                        <p className="text-xs text-muted-foreground flex-1 mb-4 line-clamp-2">{item.description || "No description provided."}</p>
                        <div className="pt-3 border-t border-border mt-auto"><div className="flex items-baseline justify-between"><span className="text-xs text-muted-foreground">per {item.unit} incl VAT</span><span className="text-xl font-bold text-foreground">{formatZar(inclVat)}</span></div></div>
                      </motion.div>
                    );
                  })}
                </div>
              )

            ) : activeTab === "voip-solutions" ? (
              filteredVoip.length === 0 ? (
                <EmptyState icon={Phone} label="No VoIP solutions available" />
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredVoip.map((item: Service, idx) => {
                    const { inclVat } = vatPrices(item as any);
                    return (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} key={item.id} className="bg-background border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all flex flex-col h-full">
                        <div className="flex justify-between items-start mb-3"><div className="p-2 bg-orange-500/10 text-orange-400 rounded-lg"><Phone className="w-4 h-4" /></div><span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 bg-muted/50 rounded-full">{(item as any).categoryName || "VoIP Solutions"}</span></div>
                        <h3 className="font-display font-bold text-foreground mb-1.5">{item.name}</h3>
                        <p className="text-xs text-muted-foreground flex-1 mb-4 line-clamp-2">{item.description || "No description provided."}</p>
                        <div className="pt-3 border-t border-border mt-auto"><div className="flex items-baseline justify-between"><span className="text-xs text-muted-foreground">per {item.unit} incl VAT</span><span className="text-xl font-bold text-foreground">{formatZar(inclVat)}</span></div></div>
                      </motion.div>
                    );
                  })}
                </div>
              )

            ) : activeTab === "connectivity" ? (
              filteredConnectivity.length === 0 ? (
                <EmptyState icon={Network} label="No connectivity packages available" />
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredConnectivity.map((item: ConnectivityItem, idx) => {
                    const exclVat = Number(item.resellerPriceExclVat ?? item.retailPriceExclVat ?? 0);
                    const inclVat = item.resellerPriceExclVat != null
                      ? Number(item.resellerPriceInclVat ?? exclVat * 1.15)
                      : Number(item.retailPriceInclVat ?? exclVat * 1.15);
                    const setupFee = Number(item.setupFeeExclVat ?? 0);
                    return (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} key={item.id} className="bg-background border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all flex flex-col h-full">
                        <div className="flex justify-between items-start mb-3">
                          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><Network className="w-4 h-4" /></div>
                          <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 bg-muted/50 rounded-full">{item.categoryName || "Connectivity"}</span>
                        </div>
                        <h3 className="font-display font-bold text-foreground mb-1">{item.name}</h3>
                        {item.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{item.description}</p>}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {item.speed && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{item.speed}</span>}
                          {item.provider && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">{item.provider}</span>}
                          {item.contention && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{item.contention}</span>}
                          {item.contractMonths != null && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{item.contractMonths}m</span>}
                        </div>
                        <div className="pt-3 border-t border-border mt-auto">
                          <div className="flex items-baseline justify-between mb-0.5">
                            <span className="text-xs text-muted-foreground">per month incl VAT</span>
                            <span className="text-xl font-bold text-foreground">{formatZar(inclVat)}</span>
                          </div>
                          {setupFee > 0 && <p className="text-[10px] text-muted-foreground text-right mb-2">+ {formatZar(setupFee * 1.15)} setup incl VAT</p>}
                          <button onClick={() => orderItem("service", item.id)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 transition-all mt-2"><ShoppingCart className="w-3.5 h-3.5" /> Order</button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )

            ) : (
              /* ── Domains tab ──────────────────────────────────── */
              <div className="p-4 space-y-6">
                {/* Domain checker */}
                <div className="bg-gradient-to-br from-primary/8 via-primary/5 to-transparent border border-primary/20 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center"><Globe className="w-4 h-4 text-primary" /></div>
                    <div>
                      <h3 className="font-bold text-foreground">Check Domain Availability</h3>
                      <p className="text-xs text-muted-foreground">Search to see if a domain is available</p>
                    </div>
                  </div>
                  <form onSubmit={handleDomainCheck} className="flex gap-2">
                    <div className="flex-1 relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        ref={domainInputRef}
                        value={domainQuery}
                        onChange={e => setDomainQuery(e.target.value)}
                        placeholder="example.co.za"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                      />
                    </div>
                    <button type="submit" disabled={domainChecking || !domainQuery.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50">
                      {domainChecking ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      Check
                    </button>
                  </form>

                  <AnimatePresence>
                    {domainResult && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="mt-3">
                        {domainResult.status === "available" ? (
                          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                              <p className="font-bold text-emerald-700 dark:text-emerald-400 font-mono text-sm">{domainResult.domain}</p>
                              <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/15 px-2 py-0.5 rounded-full">Available!</span>
                            </div>
                            {(() => {
                              const tldStr = domainResult.domain.substring(domainResult.domain.indexOf("."));
                              const matched = domainTlds.find((t: DomainTld) => t.tld.toLowerCase() === tldStr.toLowerCase() || t.tld.toLowerCase() === `.${tldStr.toLowerCase()}`);
                              if (!matched) return null;
                              const { inclVat } = vatPrices(matched as any);
                              return (
                                <div className="flex items-center gap-3 mt-2">
                                  <div className="text-right flex-1">
                                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatZar(inclVat)}</p>
                                    <p className="text-[10px] text-emerald-600">incl VAT / {matched.registrationYears} yr</p>
                                  </div>
                                  <button onClick={() => orderDomainTld(matched.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors shadow"><ShoppingCart className="w-3.5 h-3.5" /> Register</button>
                                </div>
                              );
                            })()}
                          </div>
                        ) : domainResult.status === "registered" ? (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-red-700 dark:text-red-400 font-mono text-sm">{domainResult.domain}</p>
                              <p className="text-xs text-red-600 dark:text-red-500">This domain is already registered.</p>
                              {domainResult.nameservers && domainResult.nameservers.length > 0 && <p className="text-[10px] text-muted-foreground mt-1"><span className="font-semibold">NS:</span> {domainResult.nameservers.join(", ")}</p>}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border">
                            <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                            <p className="text-xs text-muted-foreground">Could not determine availability. Please try again.</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* TLD grid */}
                {filteredDomains.length === 0 ? (
                  <EmptyState icon={Tag} label="No domain extensions available" />
                ) : (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Available Extensions & Pricing</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {filteredDomains.map((tld: DomainTld, idx) => {
                        const { inclVat: price } = vatPrices(tld as any);
                        return (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                            key={tld.id}
                            className="bg-background border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => {
                              const clean = domainQuery.split(".")[0] || "";
                              setDomainQuery(clean ? `${clean}${tld.tld}` : tld.tld.replace(/^\./, ""));
                              setDomainResult(null);
                              domainInputRef.current?.focus();
                            }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0"><Tag className="w-3.5 h-3.5 text-primary" /></div>
                              <div>
                                <p className="font-mono font-bold text-primary">{tld.tld}</p>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tld.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>{tld.status}</span>
                              </div>
                            </div>
                            {tld.description && <p className="text-[10px] text-muted-foreground mb-2 line-clamp-1">{tld.description}</p>}
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2"><Calendar className="w-3 h-3" />{tld.registrationYears} yr registration</div>
                            <div className="pt-2 border-t border-border/60">
                              <div className="flex items-baseline justify-between mb-2">
                                <span className="text-[10px] text-muted-foreground">incl VAT</span>
                                <span className="text-lg font-bold text-foreground">{formatZar(price)}</span>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); orderDomainTld(tld.id); }} className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-[10px] shadow-md shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 transition-all"><ShoppingCart className="w-3 h-3" /> Order</button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function EmptyState({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-24">
      <Icon className="w-10 h-10 opacity-20" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
