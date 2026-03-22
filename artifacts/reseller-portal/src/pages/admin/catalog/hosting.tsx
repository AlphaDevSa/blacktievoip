import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useAdminGetHostingPackages,
  useAdminCreateHostingPackage,
  useAdminUpdateHostingPackage,
  useAdminDeleteHostingPackage,
  HostingPackage,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Globe, Trash2, Edit2, HardDrive, Mail, Database, Shield, Wifi, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { formatZar } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type PackageForm = {
  name: string;
  description: string;
  diskSpaceGb: string;
  bandwidthGb: string;
  emailAccounts: string;
  databases: string;
  subdomains: string;
  sslIncluded: boolean;
  retailPriceExclVat: string;
  resellerPriceExclVat: string;
  resellerPriceInclVat: string;
  priceInclVat: string;
  status: string;
  sortOrder: string;
};

const defaultForm: PackageForm = {
  name: "",
  description: "",
  diskSpaceGb: "5",
  bandwidthGb: "50",
  emailAccounts: "10",
  databases: "5",
  subdomains: "5",
  sslIncluded: true,
  retailPriceExclVat: "",
  resellerPriceExclVat: "",
  resellerPriceInclVat: "",
  priceInclVat: "",
  status: "active",
  sortOrder: "0",
};

export default function AdminWebHostingCatalog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: packages = [], isLoading } = useAdminGetHostingPackages();

  const createPkg = useAdminCreateHostingPackage();
  const updatePkg = useAdminUpdateHostingPackage();
  const deletePkg = useAdminDeleteHostingPackage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<HostingPackage | null>(null);
  const [form, setForm] = useState<PackageForm>(defaultForm);

  const handleRetailChange = (val: string) => {
    const n = parseFloat(val);
    const incl = !isNaN(n) ? (n * 1.15).toFixed(2) : "";
    setForm(f => ({ ...f, retailPriceExclVat: val, priceInclVat: incl }));
  };

  const handleRetailInclChange = (val: string) => {
    const n = parseFloat(val);
    const excl = !isNaN(n) ? (n / 1.15).toFixed(2) : "";
    setForm(f => ({ ...f, priceInclVat: val, retailPriceExclVat: excl }));
  };

  const handleResellerChange = (val: string) => {
    const n = parseFloat(val);
    const incl = !isNaN(n) ? (n * 1.15).toFixed(2) : "";
    setForm(f => ({ ...f, resellerPriceExclVat: val, resellerPriceInclVat: incl }));
  };

  const handleResellerInclChange = (val: string) => {
    const n = parseFloat(val);
    const excl = !isNaN(n) ? (n / 1.15).toFixed(2) : "";
    setForm(f => ({ ...f, resellerPriceInclVat: val, resellerPriceExclVat: excl }));
  };

  const openCreate = () => {
    setEditingPkg(null);
    setForm(defaultForm);
    setIsModalOpen(true);
  };

  const openEdit = (pkg: HostingPackage) => {
    setEditingPkg(pkg);
    setForm({
      name: pkg.name,
      description: pkg.description ?? "",
      diskSpaceGb: String(pkg.diskSpaceGb),
      bandwidthGb: String(pkg.bandwidthGb),
      emailAccounts: String(pkg.emailAccounts),
      databases: String(pkg.databases),
      subdomains: String(pkg.subdomains),
      sslIncluded: pkg.sslIncluded,
      retailPriceExclVat: pkg.retailPriceExclVat != null ? String(pkg.retailPriceExclVat) : "",
      resellerPriceExclVat: pkg.resellerPriceExclVat != null ? String(pkg.resellerPriceExclVat) : "",
      resellerPriceInclVat: pkg.resellerPriceInclVat != null ? String(pkg.resellerPriceInclVat) : "",
      priceInclVat: pkg.priceInclVat != null ? String(pkg.priceInclVat) : "",
      status: pkg.status,
      sortOrder: String(pkg.sortOrder),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description || undefined,
      diskSpaceGb: parseInt(form.diskSpaceGb) || 1,
      bandwidthGb: parseInt(form.bandwidthGb) || 10,
      emailAccounts: parseInt(form.emailAccounts) || 1,
      databases: parseInt(form.databases) || 1,
      subdomains: parseInt(form.subdomains) || 1,
      sslIncluded: form.sslIncluded,
      retailPriceExclVat: form.retailPriceExclVat ? parseFloat(form.retailPriceExclVat) : undefined,
      resellerPriceExclVat: form.resellerPriceExclVat ? parseFloat(form.resellerPriceExclVat) : undefined,
      resellerPriceInclVat: form.resellerPriceInclVat ? parseFloat(form.resellerPriceInclVat) : undefined,
      priceInclVat: form.priceInclVat ? parseFloat(form.priceInclVat) : undefined,
      status: form.status,
      sortOrder: parseInt(form.sortOrder) || 0,
    };
    try {
      if (editingPkg) {
        await updatePkg.mutateAsync({ id: editingPkg.id, data: payload });
        toast({ title: "Package updated" });
      } else {
        await createPkg.mutateAsync({ data: payload });
        toast({ title: "Package created" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hosting-packages"] });
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: "Error saving package", description: msg, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this hosting package?")) return;
    try {
      await deletePkg.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hosting-packages"] });
      toast({ title: "Package deleted" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: "Delete failed", description: msg, variant: "destructive" });
    }
  };

  return (
    <AppLayout role="admin" title="Web Hosting Packages">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-sm text-muted-foreground mt-1">{packages.length} package{packages.length !== 1 ? "s" : ""} configured</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all"
        >
          <Plus className="w-4 h-4" /> New Package
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Globe className="w-14 h-14 text-muted-foreground/20 mb-4" />
          <p className="text-lg font-semibold text-muted-foreground">No hosting packages yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1 mb-6">Create your first web hosting package to offer to resellers</p>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold">
            <Plus className="w-4 h-4" /> Create Package
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {(packages as HostingPackage[]).map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-foreground">{pkg.name}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pkg.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        {pkg.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(pkg)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(pkg.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {pkg.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{pkg.description}</p>
                )}

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <HardDrive className="w-3.5 h-3.5 text-primary/70" />
                    <span>{pkg.diskSpaceGb} GB Disk</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Wifi className="w-3.5 h-3.5 text-primary/70" />
                    <span>{pkg.bandwidthGb} GB Bandwidth</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 text-primary/70" />
                    <span>{pkg.emailAccounts} Email Accounts</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Database className="w-3.5 h-3.5 text-primary/70" />
                    <span>{pkg.databases} Database{pkg.databases !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe className="w-3.5 h-3.5 text-primary/70" />
                    <span>{pkg.subdomains} Subdomain{pkg.subdomains !== 1 ? "s" : ""}</span>
                  </div>
                  {pkg.sslIncluded && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                      <Shield className="w-3.5 h-3.5" />
                      <span>SSL Included</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border/60 pt-3 space-y-1">
                  {pkg.retailPriceExclVat != null && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Retail excl VAT</span>
                      <span className="font-semibold text-foreground">{formatZar(pkg.retailPriceExclVat)}/mo</span>
                    </div>
                  )}
                  {pkg.priceInclVat != null && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Retail incl VAT</span>
                      <span className="font-semibold text-foreground">{formatZar(pkg.priceInclVat)}/mo</span>
                    </div>
                  )}
                  {pkg.resellerPriceExclVat != null && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Reseller excl VAT</span>
                      <span className="font-semibold text-primary">{formatZar(pkg.resellerPriceExclVat)}/mo</span>
                    </div>
                  )}
                  {pkg.resellerPriceInclVat != null && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Reseller incl VAT</span>
                      <span className="font-bold text-primary">{formatZar(pkg.resellerPriceInclVat)}/mo</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPkg ? "Edit Hosting Package" : "New Hosting Package"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Package Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Starter Hosting" className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Brief description of this hosting plan" className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none resize-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Disk Space (GB)</label>
              <input type="number" min="1" value={form.diskSpaceGb} onChange={e => setForm(f => ({ ...f, diskSpaceGb: e.target.value }))} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bandwidth (GB)</label>
              <input type="number" min="1" value={form.bandwidthGb} onChange={e => setForm(f => ({ ...f, bandwidthGb: e.target.value }))} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email Accounts</label>
              <input type="number" min="0" value={form.emailAccounts} onChange={e => setForm(f => ({ ...f, emailAccounts: e.target.value }))} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Databases</label>
              <input type="number" min="0" value={form.databases} onChange={e => setForm(f => ({ ...f, databases: e.target.value }))} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Subdomains</label>
              <input type="number" min="0" value={form.subdomains} onChange={e => setForm(f => ({ ...f, subdomains: e.target.value }))} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, sslIncluded: !f.sslIncluded }))}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${form.sslIncluded ? "bg-primary" : "bg-border"}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.sslIncluded ? "translate-x-4" : "translate-x-0"}`} />
                </div>
                <span className="text-sm font-medium">SSL Certificate Included</span>
              </label>
            </div>

            <div className="md:col-span-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Pricing (per month)</p>
              <p className="text-xs text-muted-foreground/60 mb-3">Enter either excl or incl VAT — the other field calculates automatically at 15%.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Retail excl VAT (R)</label>
                  <input type="number" step="0.01" min="0" value={form.retailPriceExclVat} onChange={e => handleRetailChange(e.target.value)} placeholder="0.00" className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Retail incl VAT (R) <span className="text-primary/60 font-normal text-xs">(auto ↔)</span></label>
                  <input type="number" step="0.01" min="0" value={form.priceInclVat} onChange={e => handleRetailInclChange(e.target.value)} placeholder="0.00" className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Reseller excl VAT (R)</label>
                  <input type="number" step="0.01" min="0" value={form.resellerPriceExclVat} onChange={e => handleResellerChange(e.target.value)} placeholder="0.00" className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Reseller incl VAT (R) <span className="text-primary/60 font-normal text-xs">(auto ↔)</span></label>
                  <input type="number" step="0.01" min="0" value={form.resellerPriceInclVat} onChange={e => handleResellerInclChange(e.target.value)} placeholder="0.00" className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={createPkg.isPending || updatePkg.isPending} className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-60">
              {editingPkg ? "Save Changes" : "Create Package"}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
