import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useAdminGetServiceCategories,
  useAdminCreateServiceCategory,
  useAdminUpdateServiceCategory,
  useAdminDeleteServiceCategory,
  useAdminGetProductCategories,
  useAdminCreateProductCategory,
  useAdminUpdateProductCategory,
  useAdminDeleteProductCategory,
  useAdminGetConnectivityCategories,
  useAdminCreateConnectivityCategory,
  useAdminUpdateConnectivityCategory,
  useAdminDeleteConnectivityCategory,
  Category,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FolderTree, Plus, Trash2, Edit2, Server, Package, Wifi,
  ChevronRight, Tag, Hash, FolderOpen, Folder
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";

type CatalogType = "service" | "product" | "connectivity";

interface TabConfig {
  id: CatalogType;
  label: string;
  icon: React.ElementType;
  color: string;
  queryKey: string;
}

const TABS: TabConfig[] = [
  { id: "service", label: "Service Categories", icon: Server, color: "text-blue-500", queryKey: "/api/admin/service-categories" },
  { id: "product", label: "Product Categories", icon: Package, color: "text-violet-500", queryKey: "/api/admin/product-categories" },
  { id: "connectivity", label: "Connectivity Categories", icon: Wifi, color: "text-emerald-500", queryKey: "/api/admin/connectivity-categories" },
];

interface CatFormState {
  name: string;
  description: string;
  parentId: string;
  sortOrder: string;
}

const defaultForm: CatFormState = { name: "", description: "", parentId: "", sortOrder: "0" };

function CategoryBadge({ cat }: { cat: Category }) {
  const isSubcat = !!cat.parentId;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
      isSubcat
        ? "bg-primary/5 text-primary border-primary/20"
        : "bg-muted/30 text-muted-foreground border-border"
    }`}>
      {isSubcat ? <ChevronRight className="w-2.5 h-2.5" /> : <Folder className="w-2.5 h-2.5" />}
      {isSubcat ? "Sub-category" : "Category"}
    </span>
  );
}

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<CatalogType>("service");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CatFormState>(defaultForm);
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());

  const { data: serviceCategories = [] } = useAdminGetServiceCategories();
  const { data: productCategories = [] } = useAdminGetProductCategories();
  const { data: connectivityCategories = [] } = useAdminGetConnectivityCategories();

  const createService = useAdminCreateServiceCategory();
  const updateService = useAdminUpdateServiceCategory();
  const deleteService = useAdminDeleteServiceCategory();

  const createProduct = useAdminCreateProductCategory();
  const updateProduct = useAdminUpdateProductCategory();
  const deleteProduct = useAdminDeleteProductCategory();

  const createConnectivity = useAdminCreateConnectivityCategory();
  const updateConnectivity = useAdminUpdateConnectivityCategory();
  const deleteConnectivity = useAdminDeleteConnectivityCategory();

  function getCurrent(): Category[] {
    if (activeTab === "service") return serviceCategories;
    if (activeTab === "product") return productCategories;
    return connectivityCategories;
  }

  function getQueryKey() {
    return TABS.find(t => t.id === activeTab)?.queryKey ?? "";
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: [getQueryKey()] });
  }

  function openCreate(parentId?: number) {
    setEditing(null);
    setForm({ ...defaultForm, parentId: parentId ? String(parentId) : "" });
    setIsModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description ?? "",
      parentId: cat.parentId ? String(cat.parentId) : "",
      sortOrder: String(cat.sortOrder),
    });
    setIsModalOpen(true);
  }

  async function handleDelete(cat: Category) {
    const current = getCurrent();
    const hasChildren = current.some(c => c.parentId === cat.id);
    if (hasChildren) {
      toast({ title: "Cannot delete — has sub-categories", variant: "destructive" });
      return;
    }
    if (!confirm(`Delete "${cat.name}"?`)) return;
    try {
      if (activeTab === "service") await deleteService.mutateAsync({ id: cat.id });
      else if (activeTab === "product") await deleteProduct.mutateAsync({ id: cat.id });
      else await deleteConnectivity.mutateAsync({ id: cat.id });
      toast({ title: `"${cat.name}" deleted` });
      invalidate();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  }

  async function handleSave() {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      parentId: form.parentId ? parseInt(form.parentId) : undefined,
      sortOrder: parseInt(form.sortOrder) || 0,
    };
    if (!payload.name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    try {
      if (editing) {
        if (activeTab === "service") await updateService.mutateAsync({ id: editing.id, data: payload });
        else if (activeTab === "product") await updateProduct.mutateAsync({ id: editing.id, data: payload });
        else await updateConnectivity.mutateAsync({ id: editing.id, data: payload });
        toast({ title: `"${payload.name}" updated` });
      } else {
        if (activeTab === "service") await createService.mutateAsync({ data: payload });
        else if (activeTab === "product") await createProduct.mutateAsync({ data: payload });
        else await createConnectivity.mutateAsync({ data: payload });
        toast({ title: `"${payload.name}" created` });
      }
      invalidate();
      setIsModalOpen(false);
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  }

  const current = getCurrent();
  const parents = current.filter(c => !c.parentId);
  const subcatsFor = (parentId: number) => current.filter(c => c.parentId === parentId);
  const currentTab = TABS.find(t => t.id === activeTab)!;
  const TabIcon = currentTab.icon;

  function toggleExpand(id: number) {
    setExpandedCats(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  return (
    <AppLayout role="admin">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FolderTree className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Categories &amp; Sub-Categories</h1>
              <p className="text-xs text-muted-foreground">Manage catalog organisation across all catalog types</p>
            </div>
          </div>
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-muted/20 rounded-xl p-1 border border-border">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = (tab.id === "service" ? serviceCategories : tab.id === "product" ? productCategories : connectivityCategories).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? tab.color : ""}`} />
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-background border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total</p>
            <p className="text-2xl font-bold text-foreground">{current.length}</p>
            <p className="text-xs text-muted-foreground">categories</p>
          </div>
          <div className="bg-background border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Parent</p>
            <p className="text-2xl font-bold text-foreground">{parents.length}</p>
            <p className="text-xs text-muted-foreground">top-level</p>
          </div>
          <div className="bg-background border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Sub-cats</p>
            <p className="text-2xl font-bold text-foreground">{current.filter(c => !!c.parentId).length}</p>
            <p className="text-xs text-muted-foreground">sub-categories</p>
          </div>
        </div>

        {/* Category tree */}
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
            <TabIcon className={`w-4 h-4 ${currentTab.color}`} />
            <span className="text-sm font-semibold text-foreground">{currentTab.label}</span>
          </div>

          {parents.length === 0 ? (
            <div className="p-12 text-center">
              <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No categories yet</p>
              <button onClick={() => openCreate()} className="mt-3 text-xs font-semibold text-primary hover:underline">
                + Create your first category
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {parents.map((parent, pidx) => {
                const subs = subcatsFor(parent.id);
                const isExpanded = expandedCats.has(parent.id);
                return (
                  <motion.div
                    key={parent.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: pidx * 0.04 }}
                  >
                    {/* Parent row */}
                    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/10 transition-colors group">
                      <button
                        onClick={() => toggleExpand(parent.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""} ${subs.length === 0 ? "opacity-20" : ""}`} />
                      </button>
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Folder className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-foreground">{parent.name}</p>
                          <CategoryBadge cat={parent} />
                          {(parent as any).itemCount != null && (
                            <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border">
                              {(parent as any).itemCount} items
                            </span>
                          )}
                        </div>
                        {parent.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{parent.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-muted/30 px-1.5 py-0.5 rounded border border-border font-mono">
                          sort: {parent.sortOrder}
                        </span>
                        <span className="bg-muted/30 px-1.5 py-0.5 rounded border border-border">
                          {subs.length} sub-cat{subs.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openCreate(parent.id)}
                          className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-muted-foreground hover:text-emerald-600 transition-colors"
                          title="Add sub-category"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(parent)}
                          className="p-1.5 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(parent)}
                          className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Sub-category rows */}
                    {isExpanded && subs.map((sub, sidx) => (
                      <motion.div
                        key={sub.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: sidx * 0.03 }}
                        className="flex items-center gap-3 pl-16 pr-5 py-2.5 bg-muted/5 hover:bg-muted/10 border-t border-dashed border-border/50 transition-colors group"
                      >
                        <div className="w-6 h-6 rounded-md bg-primary/5 flex items-center justify-center">
                          <Tag className="w-3 h-3 text-primary/60" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-xs text-foreground">{sub.name}</p>
                            <CategoryBadge cat={sub} />
                            {(sub as any).itemCount != null && (
                              <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border">
                                {(sub as any).itemCount} items
                              </span>
                            )}
                          </div>
                          {sub.description && (
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{sub.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(sub)}
                            className="p-1.5 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(sub)}
                            className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Orphaned subcats (parentId set but parent not found) */}
        {current.filter(c => c.parentId && !current.find(p => p.id === c.parentId)).length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-600 mb-2">⚠ Orphaned sub-categories (parent deleted)</p>
            <div className="space-y-1">
              {current.filter(c => c.parentId && !current.find(p => p.id === c.parentId)).map(c => (
                <div key={c.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Hash className="w-3 h-3" />
                  {c.name}
                  <button onClick={() => openEdit(c)} className="text-primary hover:underline">edit</button>
                  <button onClick={() => handleDelete(c)} className="text-destructive hover:underline">delete</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? `Edit: ${editing.name}` : "New Category"}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {/* Tab indicator */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20 border border-border`}>
            <TabIcon className={`w-4 h-4 ${currentTab.color}`} />
            <span className="text-xs font-semibold text-muted-foreground">{currentTab.label}</span>
          </div>

          {/* Parent selector */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Type</label>
            <select
              value={form.parentId}
              onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— Top-level category</option>
              {parents
                .filter(p => !editing || p.id !== editing.id)
                .map(p => (
                  <option key={p.id} value={p.id}>Sub-category of: {p.name}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. Fibre Internet"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Optional description..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Sort Order</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              {editing ? "Save Changes" : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
