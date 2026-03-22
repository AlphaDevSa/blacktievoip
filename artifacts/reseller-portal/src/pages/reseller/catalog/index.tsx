import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useGetCatalogServices, 
  useGetCatalogProducts,
  useGetCatalogHostingPackages,
  useGetCatalogDomainTlds,
  Service,
  Product,
  HostingPackage,
  DomainTld,
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Server, Package, Search, Globe, HardDrive, Mail, Database, Shield, Wifi, Tag, Calendar } from "lucide-react";
import { formatZar } from "@/lib/utils";

type Tab = "services" | "products" | "hosting" | "domains";

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
  const [activeTab, setActiveTab] = useState<Tab>("services");
  const [search, setSearch] = useState("");

  const { data: services = [], isLoading: loadingS } = useGetCatalogServices();
  const { data: products = [], isLoading: loadingP } = useGetCatalogProducts();
  const { data: hostingPackages = [], isLoading: loadingH } = useGetCatalogHostingPackages();
  const { data: domainTlds = [], isLoading: loadingD } = useGetCatalogDomainTlds();

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

  const tabs: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: "services", label: "VoIP Services", icon: Server, count: services.length },
    { id: "products", label: "Hardware", icon: Package, count: products.length },
    { id: "hosting", label: "Web Hosting", icon: Globe, count: hostingPackages.length },
    { id: "domains", label: "Domains", icon: Tag, count: domainTlds.length },
  ];

  const isLoading = activeTab === "services" ? loadingS
    : activeTab === "products" ? loadingP
    : activeTab === "hosting" ? loadingH
    : loadingD;

  return (
    <AppLayout role="reseller" title="Product & Service Catalog">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap gap-1 bg-card border border-border p-1 rounded-xl shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch(""); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === tab.id ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.id ? "bg-white/20 text-white" : "bg-black/[0.07] text-muted-foreground"}`}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="min-h-[500px]">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === "services" ? (
          filteredServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Server className="w-12 h-12 opacity-20 mb-3" />
              <p className="font-medium">No services found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredServices.map((service: Service, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                  key={service.id}
                  className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg transition-all flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
                      <Server className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground px-2.5 py-1 bg-black/5 rounded-full">{service.categoryName || "Service"}</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-2">{service.name}</h3>
                  <p className="text-sm text-muted-foreground flex-1 mb-6">{service.description || "No description provided."}</p>
                  <div className="pt-4 border-t border-border flex items-baseline justify-between mt-auto">
                    <span className="text-sm text-muted-foreground">Pricing</span>
                    <div className="text-right">
                      {(() => {
                        const { inclVat } = vatPrices(service as any);
                        return <>
                          <span className="text-2xl font-bold text-foreground">{formatZar(inclVat)}</span>
                          <span className="text-sm text-muted-foreground ml-1">/{service.unit} incl VAT</span>
                        </>;
                      })()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        ) : activeTab === "products" ? (
          filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Package className="w-12 h-12 opacity-20 mb-3" />
              <p className="font-medium">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product: Product, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                  key={product.id}
                  className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg transition-all flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg">
                      <Package className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground px-2.5 py-1 bg-black/5 rounded-full">{product.categoryName || "Hardware"}</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-1">{product.name}</h3>
                  {product.sku && <p className="text-xs font-mono text-muted-foreground mb-3">SKU: {product.sku}</p>}
                  <p className="text-sm text-muted-foreground flex-1 mb-6">{product.description || "No description provided."}</p>
                  <div className="pt-4 border-t border-border flex items-center justify-between mt-auto">
                    <div className={`text-xs font-bold px-2 py-1 rounded ${product.stockCount > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {product.stockCount > 0 ? "In Stock" : "Out of Stock"}
                    </div>
                    {(() => {
                        const { inclVat } = vatPrices(product as any);
                        return <><span className="text-2xl font-bold text-foreground">{formatZar(inclVat)}</span><span className="text-xs text-muted-foreground ml-1">incl VAT</span></>;
                      })()}
                  </div>
                </motion.div>
              ))}
            </div>
          )
        ) : activeTab === "hosting" ? (
          filteredHosting.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Globe className="w-12 h-12 opacity-20 mb-3" />
              <p className="font-medium">No hosting packages available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredHosting.map((pkg: HostingPackage, idx) => {
                const { inclVat: price } = vatPrices(pkg as any);
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                    key={pkg.id}
                    className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg transition-all flex flex-col h-full"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
                        <Globe className="w-5 h-5" />
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pkg.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                        {pkg.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-display font-bold text-foreground mb-1">{pkg.name}</h3>
                    {pkg.description && <p className="text-sm text-muted-foreground mb-4">{pkg.description}</p>}
                    <div className="grid grid-cols-2 gap-2 mb-4 flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <HardDrive className="w-3.5 h-3.5 text-primary/60" />{pkg.diskSpaceGb} GB Disk
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Wifi className="w-3.5 h-3.5 text-primary/60" />{pkg.bandwidthGb} GB Bandwidth
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="w-3.5 h-3.5 text-primary/60" />{pkg.emailAccounts} Email Accounts
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Database className="w-3.5 h-3.5 text-primary/60" />{pkg.databases} Database{pkg.databases !== 1 ? "s" : ""}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Globe className="w-3.5 h-3.5 text-primary/60" />{pkg.subdomains} Subdomains
                      </div>
                      {pkg.sslIncluded && (
                        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                          <Shield className="w-3.5 h-3.5" />SSL Included
                        </div>
                      )}
                    </div>
                    <div className="pt-4 border-t border-border flex items-baseline justify-between mt-auto">
                      <span className="text-sm text-muted-foreground">per month</span>
                      <span className="text-2xl font-bold text-primary">{formatZar(price)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : (
          /* Domains tab */
          filteredDomains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Tag className="w-12 h-12 opacity-20 mb-3" />
              <p className="font-medium">No domain extensions available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDomains.map((tld: DomainTld, idx) => {
                const { inclVat: price } = vatPrices(tld as any);
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                    key={tld.id}
                    className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Tag className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-mono font-bold text-primary text-lg">{tld.tld}</p>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${tld.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                          {tld.status}
                        </span>
                      </div>
                    </div>
                    {tld.description && (
                      <p className="text-xs text-muted-foreground mb-3">{tld.description}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <Calendar className="w-3 h-3" />
                      <span>{tld.registrationYears} year registration</span>
                    </div>
                    <div className="pt-3 border-t border-border/60 flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">incl VAT</span>
                      <span className="text-xl font-bold text-foreground">{formatZar(price)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        )}
      </div>

    </AppLayout>
  );
}
