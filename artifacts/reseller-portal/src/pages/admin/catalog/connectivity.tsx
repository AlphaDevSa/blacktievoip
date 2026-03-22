import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useAdminGetConnectivityCategories,
  useAdminGetConnectivityItems,
  useAdminCreateConnectivityItem,
  useAdminUpdateConnectivityItem,
  useAdminDeleteConnectivityItem,
  ConnectivityItem,
  Category,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Wifi, Plus, Trash2, Edit2, LayoutGrid, List, Tag, Clock,
  Zap, Building, Cable, SignalHigh
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { formatZar } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type ViewMode = "card" | "list";

interface ItemForm {
  categoryId: string;
  name: string;
  description: string;
  speed: string;
  provider: string;
  contention: string;
  contractMonths: string;
  setupFeeExclVat: string;
  retailPriceExclVat: string;
  retailPriceInclVat: string;
  resellerPriceExclVat: string;
  resellerPriceInclVat: string;
  status: string;
  sortOrder: string;
}

const defaultForm: ItemForm = {
  categoryId: "", name: "", description: "", speed: "", provider: "",
  contention: "", contractMonths: "12", setupFeeExclVat: "",
  retailPriceExclVat: "", retailPriceInclVat: "",
  resellerPriceExclVat: "", resellerPriceInclVat: "",
  status: "active", sortOrder: "0",
};

const VAT = 0.15;

function autoFillVat(changed: keyof ItemForm, value: string): Partial<ItemForm> {
  const n = parseFloat(value) || 0;
  if (changed === "retailPriceExclVat") return { retailPriceInclVat: (n * (1 + VAT)).toFixed(2) };
  if (changed === "retailPriceInclVat") return { retailPriceExclVat: (n / (1 + VAT)).toFixed(2) };
  if (changed === "resellerPriceExclVat") return { resellerPriceInclVat: (n * (1 + VAT)).toFixed(2) };
  if (changed === "resellerPriceInclVat") return { resellerPriceExclVat: (n / (1 + VAT)).toFixed(2) };
  return {};
}

function getCategoryHierarchy(categories: Category[], catId: number | null | undefined): string {
  if (!catId) return "Uncategorised";
  const cat = categories.find(c => c.id === catId);
  if (!cat) return "Unknown";
  if (cat.parentId) {
    const parent = categories.find(c => c.id === cat.parentId);
    return parent ? `${parent.name} → ${cat.name}` : cat.name;
  }
  return cat.name;
}

function PriceInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold">R</span>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="0.00"
        />
      </div>
    </div>
  );
}

export default function AdminConnectivityCatalog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories = [] } = useAdminGetConnectivityCategories();
  const { data: items = [] } = useAdminGetConnectivityItems();

  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ConnectivityItem | null>(null);
  const [form, setForm] = useState<ItemForm>(defaultForm);

  const create = useAdminCreateConnectivityItem();
  const update = useAdminUpdateConnectivityItem();
  const del = useAdminDeleteConnectivityItem();

  const filteredItems = selectedCatId
    ? items.filter(i => i.categoryId === selectedCatId)
    : items;

  const parentCategories = categories.filter(c => !c.parentId);
  const subCatsOf = (id: number) => categories.filter(c => c.parentId === id);

  function openCreate() {
    setEditing(null);
    setForm({ ...defaultForm, categoryId: selectedCatId ? String(selectedCatId) : "" });
    setIsModalOpen(true);
  }

  function openEdit(item: ConnectivityItem) {
    setEditing(item);
    setForm({
      categoryId: item.categoryId ? String(item.categoryId) : "",
      name: item.name,
      description: item.description ?? "",
      speed: item.speed ?? "",
      provider: item.provider ?? "",
      contention: item.contention ?? "",
      contractMonths: String(item.contractMonths ?? 12),
      setupFeeExclVat: item.setupFeeExclVat != null ? String(item.setupFeeExclVat) : "",
      retailPriceExclVat: item.retailPriceExclVat != null ? String(item.retailPriceExclVat) : "",
      retailPriceInclVat: item.retailPriceInclVat != null ? String(item.retailPriceInclVat) : "",
      resellerPriceExclVat: item.resellerPriceExclVat != null ? String(item.resellerPriceExclVat) : "",
      resellerPriceInclVat: item.resellerPriceInclVat != null ? String(item.resellerPriceInclVat) : "",
      status: item.status ?? "active",
      sortOrder: String(item.sortOrder ?? 0),
    });
    setIsModalOpen(true);
  }

  function setField(key: keyof ItemForm, value: string) {
    const extra = autoFillVat(key, value);
    setForm(f => ({ ...f, [key]: value, ...extra }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const payload = {
      categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
      name: form.name.trim(),
      description: form.description || undefined,
      speed: form.speed || undefined,
      provider: form.provider || undefined,
      contention: form.contention || undefined,
      contractMonths: parseInt(form.contractMonths) || 12,
      setupFeeExclVat: form.setupFeeExclVat ? parseFloat(form.setupFeeExclVat) : undefined,
      retailPriceExclVat: form.retailPriceExclVat ? parseFloat(form.retailPriceExclVat) : undefined,
      retailPriceInclVat: form.retailPriceInclVat ? parseFloat(form.retailPriceInclVat) : undefined,
      resellerPriceExclVat: form.resellerPriceExclVat ? parseFloat(form.resellerPriceExclVat) : undefined,
      resellerPriceInclVat: form.resellerPriceInclVat ? parseFloat(form.resellerPriceInclVat) : undefined,
      status: form.status as "active" | "inactive",
      sortOrder: parseInt(form.sortOrder) || 0,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, data: payload });
        toast({ title: `"${payload.name}" updated` });
      } else {
        await create.mutateAsync({ data: payload });
        toast({ title: `"${payload.name}" added` });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/connectivity-items"] });
      setIsModalOpen(false);
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  }

  async function handleDelete(item: ConnectivityItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await del.mutateAsync({ id: item.id });
      toast({ title: `"${item.name}" deleted` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/connectivity-items"] });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  }

  return (
    <AppLayout role="admin">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Connectivity Catalog</h1>
              <p className="text-xs text-muted-foreground">Manage fibre, LTE, wireless &amp; other connectivity products</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("card")}
                className={`p-2 ${viewMode === "card" ? "bg-primary text-primary-foreground" : "hover:bg-muted/20 text-muted-foreground"}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted/20 text-muted-foreground"}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </div>

        <div className="flex gap-5">
          {/* Category sidebar */}
          <div className="w-52 shrink-0 space-y-1">
            <button
              onClick={() => setSelectedCatId(null)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                !selectedCatId ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2"><Wifi className="w-3.5 h-3.5" />All Items</div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${!selectedCatId ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>
                {items.length}
              </span>
            </button>

            {parentCategories.map(parent => {
              const subs = subCatsOf(parent.id);
              const parentActive = selectedCatId === parent.id;
              return (
                <div key={parent.id}>
                  <button
                    onClick={() => setSelectedCatId(parent.id === selectedCatId ? null : parent.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      parentActive ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Cable className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{parent.name}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${parentActive ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>
                      {items.filter(i => i.categoryId === parent.id).length}
                    </span>
                  </button>
                  {subs.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedCatId(sub.id === selectedCatId ? null : sub.id)}
                      className={`w-full flex items-center justify-between pl-7 pr-3 py-1.5 rounded-lg text-xs transition-all ${
                        selectedCatId === sub.id ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-semibold" : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Tag className="w-3 h-3 shrink-0" />
                        <span className="truncate">{sub.name}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${selectedCatId === sub.id ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>
                        {items.filter(i => i.categoryId === sub.id).length}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {filteredItems.length === 0 ? (
              <div className="bg-background border border-border rounded-xl p-12 text-center">
                <Wifi className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No connectivity items yet</p>
                <button onClick={openCreate} className="mt-3 text-xs font-semibold text-primary hover:underline">
                  + Add your first item
                </button>
              </div>
            ) : viewMode === "card" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="bg-background border border-border rounded-xl p-4 group hover:shadow-md hover:shadow-black/5 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <SignalHigh className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(item)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-semibold text-sm text-foreground mb-0.5 truncate">{item.name}</h3>
                    {item.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.description}</p>}

                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.speed && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-blue-500/10 text-blue-500 border-blue-500/20">
                          <Zap className="w-2.5 h-2.5" />{item.speed}
                        </span>
                      )}
                      {item.provider && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-violet-500/10 text-violet-500 border-violet-500/20">
                          <Building className="w-2.5 h-2.5" />{item.provider}
                        </span>
                      )}
                      {item.contractMonths && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20">
                          <Clock className="w-2.5 h-2.5" />{item.contractMonths}mo
                        </span>
                      )}
                    </div>

                    <div className="border-t border-dashed border-border pt-2 space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Retail (incl VAT)</span>
                        <span className="font-bold text-foreground">{formatZar(item.retailPriceInclVat ?? 0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Reseller (incl VAT)</span>
                        <span className="font-semibold text-primary">{formatZar(item.resellerPriceInclVat ?? 0)}</span>
                      </div>
                      {item.setupFeeExclVat != null && item.setupFeeExclVat > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Setup fee</span>
                          <span className="text-muted-foreground">{formatZar(item.setupFeeExclVat)}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground truncate">
                        {getCategoryHierarchy(categories, item.categoryId)}
                      </p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.status === "active"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-red-500/10 text-red-500 border-red-500/20"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-background border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-5 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Speed</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Provider</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Retail incl</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Reseller incl</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredItems.map((item, idx) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        className="hover:bg-muted/10 transition-colors group"
                      >
                        <td className="px-5 py-3">
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{getCategoryHierarchy(categories, item.categoryId)}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{item.speed ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{item.provider ?? "—"}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{formatZar(item.retailPriceInclVat ?? 0)}</td>
                        <td className="px-4 py-3 font-semibold text-primary">{formatZar(item.resellerPriceInclVat ?? 0)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.status === "active"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(item)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? `Edit: ${editing.name}` : "Add Connectivity Item"}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Category</label>
            <select
              value={form.categoryId}
              onChange={e => setField("categoryId", e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— No category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.parentId ? `  ↳ ${cat.name}` : cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Name *</label>
              <input
                value={form.name}
                onChange={e => setField("name", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Fibre 100/50 Mbps Residential"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={e => setField("status", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setField("description", e.target.value)}
              rows={2}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Optional description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Speed</label>
              <input
                value={form.speed}
                onChange={e => setField("speed", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. 100/50 Mbps"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Provider</label>
              <input
                value={form.provider}
                onChange={e => setField("provider", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Openserve"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Contention</label>
              <input
                value={form.contention}
                onChange={e => setField("contention", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. 1:1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Contract (months)</label>
              <input
                type="number"
                value={form.contractMonths}
                onChange={e => setField("contractMonths", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <PriceInput label="Setup Fee (excl VAT)" value={form.setupFeeExclVat} onChange={v => setField("setupFeeExclVat", v)} />

          <div className="bg-muted/10 rounded-xl p-4 border border-border/50 space-y-3">
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">Monthly Pricing (15% VAT auto-filled)</p>
            <div className="grid grid-cols-2 gap-3">
              <PriceInput label="Retail excl VAT" value={form.retailPriceExclVat} onChange={v => setField("retailPriceExclVat", v)} />
              <PriceInput label="Retail incl VAT" value={form.retailPriceInclVat} onChange={v => setField("retailPriceInclVat", v)} />
              <PriceInput label="Reseller excl VAT" value={form.resellerPriceExclVat} onChange={v => setField("resellerPriceExclVat", v)} />
              <PriceInput label="Reseller incl VAT" value={form.resellerPriceInclVat} onChange={v => setField("resellerPriceInclVat", v)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Sort Order</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={e => setField("sortOrder", e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
            >
              {editing ? "Save Changes" : "Create Item"}
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
