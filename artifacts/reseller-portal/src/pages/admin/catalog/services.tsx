import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useAdminGetServiceCategories, 
  useAdminGetServices,
  useAdminCreateServiceCategory,
  useAdminCreateService,
  useAdminUpdateService,
  useAdminDeleteService,
  useAdminDeleteServiceCategory,
  Category,
  Service
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Server, FolderTree, Trash2, Edit2, Tag, LayoutGrid, List, Clock, Repeat, Zap } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { formatZar } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type ViewMode = "card" | "list";

function UnitBadge({ unit }: { unit: string }) {
  const map: Record<string, { label: string; color: string }> = {
    month:  { label: "/ month",   color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    year:   { label: "/ year",    color: "bg-violet-500/10 text-violet-500 border-violet-500/20" },
    once:   { label: "Once-off",  color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    minute: { label: "/ minute",  color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  };
  const m = map[unit] ?? { label: unit, color: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${m.color}`}>
      {m.label}
    </span>
  );
}

export default function AdminServicesCatalog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: categories = [] } = useAdminGetServiceCategories();
  const { data: services = [] } = useAdminGetServices();
  
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  const [editingService, setEditingService] = useState<Service | null>(null);

  const createCat = useAdminCreateServiceCategory();
  const createService = useAdminCreateService();
  const updateService = useAdminUpdateService();
  const deleteService = useAdminDeleteService();
  const deleteCat = useAdminDeleteServiceCategory();

  const filteredServices = selectedCatId 
    ? services.filter(s => s.categoryId === selectedCatId)
    : services;

  const [catForm, setCatForm] = useState({ name: "", description: "", parentId: "" });
  const [serviceForm, setServiceForm] = useState({ 
    name: "", description: "", categoryId: "",
    retailPriceExclVat: "", resellerPriceExclVat: "", resellerPriceInclVat: "", priceInclVat: "",
    unit: "month", status: "active" 
  });

  const handleRetailPriceChange = (val: string) => {
    const num = parseFloat(val);
    const inclVat = !isNaN(num) ? (num * 1.15).toFixed(2) : "";
    setServiceForm(f => ({ ...f, retailPriceExclVat: val, priceInclVat: inclVat }));
  };

  const handleResellerPriceChange = (val: string) => {
    const num = parseFloat(val);
    const inclVat = !isNaN(num) ? (num * 1.15).toFixed(2) : "";
    setServiceForm(f => ({ ...f, resellerPriceExclVat: val, resellerPriceInclVat: inclVat }));
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCat.mutateAsync({
        data: { name: catForm.name, description: catForm.description, parentId: catForm.parentId ? parseInt(catForm.parentId) : undefined, sortOrder: 0 }
      });
      toast({ title: "Category created" });
      setIsCatModalOpen(false);
      setCatForm({ name: "", description: "", parentId: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-categories"] });
    } catch {
      toast({ title: "Error creating category", variant: "destructive" });
    }
  };

  const openAddService = () => {
    setEditingService(null);
    setServiceForm({ name: "", description: "", categoryId: selectedCatId ? String(selectedCatId) : "", retailPriceExclVat: "", resellerPriceExclVat: "", resellerPriceInclVat: "", priceInclVat: "", unit: "month", status: "active" });
    setIsServiceModalOpen(true);
  };

  const openEditService = (service: Service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description ?? "",
      categoryId: service.categoryId != null ? String(service.categoryId) : "",
      retailPriceExclVat: service.retailPriceExclVat != null ? String(service.retailPriceExclVat) : "",
      resellerPriceExclVat: (service as any).resellerPriceExclVat != null ? String((service as any).resellerPriceExclVat) : "",
      resellerPriceInclVat: (service as any).resellerPriceInclVat != null ? String((service as any).resellerPriceInclVat) : "",
      priceInclVat: service.priceInclVat != null ? String(service.priceInclVat) : "",
      unit: service.unit,
      status: service.status,
    });
    setIsServiceModalOpen(true);
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const retailExcl = serviceForm.retailPriceExclVat ? parseFloat(serviceForm.retailPriceExclVat) : undefined;
      const resellerExcl = serviceForm.resellerPriceExclVat ? parseFloat(serviceForm.resellerPriceExclVat) : undefined;
      const resellerInclVat = serviceForm.resellerPriceInclVat ? parseFloat(serviceForm.resellerPriceInclVat) : undefined;
      const inclVat = serviceForm.priceInclVat ? parseFloat(serviceForm.priceInclVat) : undefined;
      const payload = {
        name: serviceForm.name, description: serviceForm.description,
        categoryId: serviceForm.categoryId ? parseInt(serviceForm.categoryId) : undefined,
        retailPriceExclVat: retailExcl, resellerPriceExclVat: resellerExcl,
        resellerPriceInclVat: resellerInclVat, priceInclVat: inclVat,
        price: retailExcl ?? 0, unit: serviceForm.unit,
        status: serviceForm.status as any, sortOrder: 0
      };
      if (editingService) {
        await updateService.mutateAsync({ id: editingService.id, data: payload });
        toast({ title: "Service updated" });
      } else {
        await createService.mutateAsync({ data: payload });
        toast({ title: "Service created" });
      }
      setIsServiceModalOpen(false);
      setEditingService(null);
      setServiceForm({ name: "", description: "", categoryId: "", retailPriceExclVat: "", resellerPriceExclVat: "", resellerPriceInclVat: "", priceInclVat: "", unit: "month", status: "active" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: editingService ? "Error updating service" : "Error creating service", description: msg, variant: "destructive" });
    }
  };

  const handleDeleteService = async (id: number) => {
    if (confirm("Are you sure you want to delete this service?")) {
      try {
        await deleteService.mutateAsync({ id });
        toast({ title: "Service deleted" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
        toast({ title: "Error deleting service", description: msg, variant: "destructive" });
      }
    }
  };

  return (
    <AppLayout role="admin" title="Services Catalog">
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">

        {/* Category sidebar */}
        <div className="w-full lg:w-56 flex flex-col bg-card border border-border rounded-2xl shadow-lg overflow-hidden shrink-0">
          <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
            <h3 className="font-display font-bold flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-primary" />
              Categories
            </h3>
            <button onClick={() => setIsCatModalOpen(true)} className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <button
              onClick={() => setSelectedCatId(null)}
              className={`w-full text-left flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all ${
                selectedCatId === null
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "hover:bg-black/5 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>All Services</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${selectedCatId === null ? "bg-black/[0.1]" : "bg-black/[0.07]"}`}>
                {services.length}
              </span>
            </button>
            {categories.map((cat: Category) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`w-full text-left flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all ${
                  selectedCatId === cat.id
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "hover:bg-black/5 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 opacity-50" />
                  {cat.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Service panel */}
        <div className="flex-1 flex flex-col bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
            <h3 className="font-display font-bold flex items-center gap-2 text-lg">
              <Server className="w-5 h-5 text-primary" />
              {selectedCatId ? categories.find(c => c.id === selectedCatId)?.name : "All Services"}
              <span className="text-xs font-normal text-muted-foreground">({filteredServices.length})</span>
            </h3>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center bg-muted/30 rounded-lg p-0.5 border border-border/50">
                <button
                  onClick={() => setViewMode("card")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "card" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title="Card view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={openAddService}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Service
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {filteredServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <Server className="w-10 h-10 opacity-20" />
                <p>No services found in this category.</p>
              </div>
            ) : viewMode === "card" ? (
              /* ── Card View ─────────────────────────────────────────── */
              <div className="p-4 grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredServices.map((service: Service, idx) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="bg-background border border-border rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Header band */}
                    <div className="relative bg-primary/5 border-b border-border/50 px-4 pt-5 pb-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Server className="w-4 h-4 text-primary" />
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          service.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        }`}>
                          {service.status}
                        </span>
                      </div>
                      <p className="font-semibold text-sm text-foreground leading-tight line-clamp-2">{service.name}</p>
                      <p className="text-[11px] text-muted-foreground">{service.categoryName || "Uncategorized"}</p>
                    </div>

                    {/* Body */}
                    <div className="p-3 flex flex-col flex-1 gap-2">
                      {service.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{service.description}</p>
                      )}

                      <div className="flex items-center gap-1.5 mt-auto">
                        <UnitBadge unit={service.unit} />
                      </div>

                      {/* Pricing */}
                      <div className="space-y-0.5 pt-1 border-t border-border/40">
                        {service.retailPriceExclVat != null && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Retail excl VAT</span>
                            <span className="font-semibold text-foreground">{formatZar(service.retailPriceExclVat)}</span>
                          </div>
                        )}
                        {service.priceInclVat != null && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Retail incl VAT</span>
                            <span className="font-medium text-foreground">{formatZar(service.priceInclVat)}</span>
                          </div>
                        )}
                        {service.resellerPriceExclVat != null && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Reseller excl VAT</span>
                            <span className="font-semibold text-primary">{formatZar(service.resellerPriceExclVat)}</span>
                          </div>
                        )}
                        {(service as any).resellerPriceInclVat != null && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Reseller incl VAT</span>
                            <span className="font-bold text-primary">{formatZar((service as any).resellerPriceInclVat)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-3 pb-3 flex gap-2">
                      <button
                        onClick={() => openEditService(service)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors border border-border/50"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-muted/30 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors border border-border/50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* ── List View ─────────────────────────────────────────── */
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/10 sticky top-0 backdrop-blur-md z-10">
                  <tr>
                    <th className="px-4 py-4 font-semibold">Service Name</th>
                    <th className="px-4 py-4 font-semibold">Category</th>
                    <th className="px-4 py-4 font-semibold">Retail excl VAT</th>
                    <th className="px-4 py-4 font-semibold">Retail incl VAT</th>
                    <th className="px-4 py-4 font-semibold">Reseller excl VAT</th>
                    <th className="px-4 py-4 font-semibold">Reseller incl VAT</th>
                    <th className="px-4 py-4 font-semibold">Status</th>
                    <th className="px-4 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredServices.map((service: Service, idx) => (
                    <motion.tr
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={service.id}
                      className="hover:bg-black/[0.03] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{service.name}</p>
                        {service.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{service.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{service.categoryName || "Uncategorized"}</td>
                      <td className="px-4 py-3 font-medium text-foreground text-sm">
                        {service.retailPriceExclVat != null ? <>{formatZar(service.retailPriceExclVat)} <span className="text-muted-foreground text-xs">/{service.unit}</span></> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground text-sm">
                        {service.priceInclVat != null ? <>{formatZar(service.priceInclVat)} <span className="text-muted-foreground text-xs">/{service.unit}</span></> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-primary text-sm">
                        {service.resellerPriceExclVat != null ? <>{formatZar(service.resellerPriceExclVat)} <span className="text-muted-foreground text-xs">/{service.unit}</span></> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary text-sm">
                        {(service as any).resellerPriceInclVat != null ? <>{formatZar((service as any).resellerPriceInclVat)} <span className="text-muted-foreground text-xs">/{service.unit}</span></> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          service.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {service.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditService(service)}
                            className="p-2 hover:bg-black/[0.07] rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      <Modal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} title="Add Category">
        <form onSubmit={handleCatSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Category Name</label>
            <input required value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g., Cloud PBX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Description (Optional)</label>
            <textarea value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none" placeholder="Brief description..." />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsCatModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5 transition-colors">Cancel</button>
            <button type="submit" disabled={createCat.isPending} className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl transition-all disabled:opacity-50">{createCat.isPending ? "Creating..." : "Create Category"}</button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Service Modal */}
      <Modal isOpen={isServiceModalOpen} onClose={() => { setIsServiceModalOpen(false); setEditingService(null); }} title={editingService ? "Edit Service" : "Add Service"} maxWidth="max-w-2xl">
        <form onSubmit={handleServiceSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Service Name</label>
              <input required value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g., Standard Extension" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Category</label>
              <select value={serviceForm.categoryId} onChange={e => setServiceForm({...serviceForm, categoryId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none appearance-none">
                <option value="">None</option>
                {categories.map((c: Category) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pricing (ZAR)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Retail excl VAT</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R</span>
                      <input type="number" step="0.01" min="0" value={serviceForm.retailPriceExclVat} onChange={e => handleRetailPriceChange(e.target.value)} className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none text-sm" placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Retail incl VAT <span className="text-primary/60 font-normal">(auto)</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R</span>
                      <input type="number" step="0.01" min="0" value={serviceForm.priceInclVat} onChange={e => setServiceForm(f => ({...f, priceInclVat: e.target.value}))} className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none text-sm" placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reseller excl VAT</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R</span>
                      <input type="number" step="0.01" min="0" value={serviceForm.resellerPriceExclVat} onChange={e => handleResellerPriceChange(e.target.value)} className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none text-sm" placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reseller incl VAT <span className="text-primary/60 font-normal">(auto)</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R</span>
                      <input type="number" step="0.01" min="0" value={serviceForm.resellerPriceInclVat} onChange={e => setServiceForm(f => ({...f, resellerPriceInclVat: e.target.value}))} className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none text-sm" placeholder="0.00" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/60">Incl VAT fields auto-fill at 15% when you enter the excl VAT price. You can override them manually.</p>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Billing Unit</label>
              <select value={serviceForm.unit} onChange={e => setServiceForm({...serviceForm, unit: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none appearance-none">
                <option value="month">Per Month</option>
                <option value="year">Per Year</option>
                <option value="once">Once-off</option>
                <option value="minute">Per Minute</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Status</label>
              <select value={serviceForm.status} onChange={e => setServiceForm({...serviceForm, status: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none appearance-none">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Description</label>
              <textarea value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none" placeholder="Features and details..." rows={3} />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => { setIsServiceModalOpen(false); setEditingService(null); }} className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5 transition-colors">Cancel</button>
            <button type="submit" disabled={createService.isPending || updateService.isPending} className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl transition-all disabled:opacity-50">
              {(createService.isPending || updateService.isPending) ? "Saving..." : editingService ? "Save Changes" : "Create Service"}
            </button>
          </div>
        </form>
      </Modal>

    </AppLayout>
  );
}
