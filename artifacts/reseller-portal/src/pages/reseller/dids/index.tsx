import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useResellerGetMyDids } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, MapPin, Calendar, ArrowRight, Search, Filter,
  LayoutGrid, List, Building, X, ChevronDown, CheckCircle2, User,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type DIDItem = {
  id: number;
  number: string;
  areaCode: string | null;
  region: string | null;
  province: string | null;
  status: string;
  clientId: number | null;
  clientName: string | null;
  assignedAt: string | null;
  notes: string | null;
};

type Client = { id: number; companyName: string };

export default function ResellerMyDids() {
  const { data: rawDids = [], isLoading } = useResellerGetMyDids();
  const dids = rawDids as unknown as DIDItem[];
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Clients for the "Set Client" dropdown
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["reseller-clients"],
    queryFn: async () => {
      const res = await fetch("/api/reseller/clients", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // UI state
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  // Inline client assignment popover
  const [assigningDid, setAssigningDid] = useState<number | null>(null);
  const [pendingClientId, setPendingClientId] = useState<string>("");

  const setClientMutation = useMutation({
    mutationFn: async ({ didId, clientId }: { didId: number; clientId: string }) => {
      const res = await fetch(`/api/reseller/dids/${didId}/set-client`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientId ? parseInt(clientId) : null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resellerGetMyDids"] });
      setAssigningDid(null);
      toast({ title: "Client updated", description: "DID allocation saved." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Derive filter options
  const provinces = useMemo(() => {
    const set = new Set(dids.map(d => d.province).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [dids]);

  // Filtered + searched list
  const filtered = useMemo(() => {
    return dids.filter(d => {
      if (provinceFilter !== "all" && d.province !== provinceFilter) return false;
      if (clientFilter === "unallocated" && d.clientId !== null) return false;
      if (clientFilter !== "all" && clientFilter !== "unallocated") {
        if (String(d.clientId) !== clientFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          d.number.toLowerCase().includes(q) ||
          (d.areaCode ?? "").toLowerCase().includes(q) ||
          (d.region ?? "").toLowerCase().includes(q) ||
          (d.province ?? "").toLowerCase().includes(q) ||
          (d.clientName ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dids, search, provinceFilter, clientFilter]);

  const allocatedCount = dids.filter(d => d.clientId).length;

  function openAssign(did: DIDItem) {
    setAssigningDid(did.id);
    setPendingClientId(did.clientId ? String(did.clientId) : "");
  }

  function confirmAssign(didId: number) {
    setClientMutation.mutate({ didId, clientId: pendingClientId });
  }

  return (
    <AppLayout role="reseller" title="My DIDs">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Assigned Phone Numbers</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {dids.length} DID{dids.length !== 1 ? "s" : ""} &bull; {allocatedCount} allocated to clients
          </p>
        </div>
        <Link
          href="/reseller/request-did"
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all shrink-0"
        >
          Request New DID <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Search, Filter, View Toggle bar */}
      {dids.length > 0 && (
        <div className="mb-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by number, area code, region, client…"
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Province filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              value={provinceFilter}
              onChange={e => setProvinceFilter(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="all">All Provinces</option>
              {provinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Client filter */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer min-w-[170px]"
            >
              <option value="all">All Clients</option>
              <option value="unallocated">Unallocated</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* View toggle */}
          <div className="flex items-center rounded-xl border border-border bg-card overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3.5 py-2.5 transition-colors ${viewMode === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Card view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3.5 py-2.5 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>

      ) : dids.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border border-dashed rounded-2xl">
          <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
            <Phone className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-display font-bold">No DIDs Assigned</h3>
          <p className="text-muted-foreground text-sm mt-2 mb-6">You don't have any phone numbers assigned yet.</p>
          <Link href="/reseller/request-did" className="text-primary hover:underline text-sm font-medium">
            Request your first DID
          </Link>
        </div>

      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card border border-border border-dashed rounded-2xl">
          <Search className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="font-medium text-muted-foreground">No DIDs match your search</p>
          <button onClick={() => { setSearch(""); setProvinceFilter("all"); setClientFilter("all"); }} className="mt-3 text-sm text-primary hover:underline">
            Clear filters
          </button>
        </div>

      ) : viewMode === "cards" ? (
        /* ── Card Grid ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {filtered.map((did, idx) => (
              <motion.div
                key={did.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                className="bg-card border border-border rounded-2xl p-5 shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors" />

                {/* Top row */}
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
                    <Phone className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>

                {/* Number */}
                <h3 className="text-2xl font-display font-bold tracking-wider text-foreground mb-3 font-mono">
                  {did.number}
                </h3>

                {/* Details */}
                <div className="space-y-1.5 text-sm mb-4">
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{did.areaCode} — {did.region}, {did.province}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span>Assigned {did.assignedAt ? format(new Date(did.assignedAt), "PP") : "Unknown"}</span>
                  </div>
                </div>

                {/* Client allocation */}
                {assigningDid === did.id ? (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60">
                    <select
                      value={pendingClientId}
                      onChange={e => setPendingClientId(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-xs bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/40"
                      autoFocus
                    >
                      <option value="">— Unallocated —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                    </select>
                    <button
                      onClick={() => confirmAssign(did.id)}
                      disabled={setClientMutation.isPending}
                      className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setAssigningDid(null)} className="px-2 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openAssign(did)}
                    className="mt-3 pt-3 border-t border-border/60 w-full flex items-center gap-2 text-xs hover:text-primary transition-colors group/client"
                  >
                    <Building className="w-3.5 h-3.5 shrink-0 text-muted-foreground group-hover/client:text-primary" />
                    {did.clientName ? (
                      <span className="font-semibold text-foreground truncate">{did.clientName}</span>
                    ) : (
                      <span className="text-muted-foreground italic">Unallocated — click to assign</span>
                    )}
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      ) : (
        /* ── List View ── */
        <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Number</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Area / Region</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Province</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Assigned</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <AnimatePresence mode="popLayout">
                {filtered.map((did) => (
                  <motion.tr
                    key={did.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-mono font-semibold">{did.number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">
                      {did.areaCode} — {did.region}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{did.province}</td>
                    <td className="px-4 py-3.5">
                      {assigningDid === did.id ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={pendingClientId}
                            onChange={e => setPendingClientId(e.target.value)}
                            className="px-2 py-1 text-xs bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/40"
                            autoFocus
                          >
                            <option value="">— Unallocated —</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                          </select>
                          <button
                            onClick={() => confirmAssign(did.id)}
                            disabled={setClientMutation.isPending}
                            className="p-1 rounded bg-primary text-primary-foreground disabled:opacity-60"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setAssigningDid(null)} className="p-1 rounded bg-muted text-muted-foreground">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : did.clientName ? (
                        <button
                          onClick={() => openAssign(did)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                        >
                          <Building className="w-3 h-3" /> {did.clientName}
                        </button>
                      ) : (
                        <button
                          onClick={() => openAssign(did)}
                          className="text-xs text-muted-foreground/60 italic hover:text-primary transition-colors"
                        >
                          Unallocated
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs hidden md:table-cell">
                      {did.assignedAt ? format(new Date(did.assignedAt), "PP") : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          <div className="px-5 py-3 border-t border-border/60 bg-muted/10 text-xs text-muted-foreground">
            Showing {filtered.length} of {dids.length} DIDs
          </div>
        </div>
      )}
    </AppLayout>
  );
}
