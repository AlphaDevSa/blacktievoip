import { useRoute, Link, useLocation } from "wouter";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatZar } from "@/lib/utils";
import { format } from "date-fns";
import { 
  useResellerGetClient, 
  useResellerUpdateClient, 
  useResellerDeleteClient,
  getResellerGetClientQueryKey,
  getResellerGetClientsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Building, Mail, Phone, MapPin, 
  CreditCard, PhoneCall, Trash2, Edit3, Save, X, FileText,
  Server, Package, Hash, HardDrive, Globe, Activity, ShoppingCart
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateClientSchema } from "@/lib/schemas";
import { PROVINCES } from "@/lib/utils";
import * as z from "zod";

type ServiceItem = {
  id: number;
  orderId: number;
  itemType: string;
  referenceId: number;
  name: string;
  sku?: string;
  quantity: number;
  unitPriceExclVat: string;
  unitPriceInclVat: string;
  lineTotal: string;
  createdAt: string;
};

function itemTypeIcon(type: string) {
  switch (type) {
    case "service": return <Server className="w-3.5 h-3.5" />;
    case "product": return <Package className="w-3.5 h-3.5" />;
    case "did": return <Hash className="w-3.5 h-3.5" />;
    case "hosting": return <HardDrive className="w-3.5 h-3.5" />;
    case "domain": return <Globe className="w-3.5 h-3.5" />;
    default: return <Package className="w-3.5 h-3.5" />;
  }
}

function itemTypeLabel(type: string) {
  switch (type) {
    case "service": return "Voice Service";
    case "product": return "Product";
    case "did": return "DID Number";
    case "hosting": return "Web Hosting";
    case "domain": return "Domain";
    default: return type;
  }
}

type FormValues = z.infer<typeof updateClientSchema>;

export default function ResellerClientView() {
  const [, params] = useRoute("/reseller/clients/:id");
  const id = parseInt(params?.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: client, isLoading } = useResellerGetClient(id);
  const updateMutation = useResellerUpdateClient();
  const deleteMutation = useResellerDeleteClient();

  const { data: activeServices = [], isLoading: servicesLoading } = useQuery<ServiceItem[]>({
    queryKey: ["reseller-client-services", id],
    queryFn: async () => {
      const res = await fetch(`/api/reseller/clients/${id}/services`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(updateClientSchema),
    values: client ? {
      companyName: client.companyName,
      contactName: client.contactName,
      email: client.email,
      phone: client.phone || "",
      unitStreetNumber: (client as any).unitStreetNumber || "",
      buildingComplex: (client as any).buildingComplex || "",
      streetName: (client as any).streetName || "",
      address: client.address || "",
      address2: (client as any).address2 || "",
      city: client.city || "",
      province: client.province || "",
      sipExtensions: client.sipExtensions,
      monthlyFee: client.monthlyFee,
      status: client.status,
      notes: client.notes || "",
    } : undefined
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await updateMutation.mutateAsync({ id, data });
      queryClient.invalidateQueries({ queryKey: getResellerGetClientQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getResellerGetClientsQueryKey() });
      toast({ title: "Success", description: "Client details updated." });
      setIsEditing(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error?.data?.error || "Update failed." });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this client?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getResellerGetClientsQueryKey() });
      toast({ title: "Deleted", description: "Client removed from your portal." });
      setLocation("/reseller/clients");
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete client." });
    }
  };

  if (isLoading || !client) {
    return (
      <AppLayout role="reseller" title="Client Details">
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="reseller" title={client.companyName}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <Link href="/reseller/clients" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to My Clients
        </Link>
        {!isEditing && (
          <div className="flex gap-3">
            <button onClick={() => setIsEditing(true)} className="flex items-center px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-xl border border-border transition-all">
              <Edit3 className="w-4 h-4 mr-2" /> Edit Client
            </button>
            <button onClick={handleDelete} className="flex items-center px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white font-medium rounded-xl border border-destructive/20 transition-all">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                <Building className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold">{client.companyName}</h2>
                <StatusBadge status={client.status} className="mt-1" />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center"><PhoneCall className="w-4 h-4 mr-2" /> SIP Ext.</span>
                <span className="font-semibold text-lg">{client.sipExtensions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center"><CreditCard className="w-4 h-4 mr-2" /> Monthly Fee</span>
                <span className="font-semibold text-primary">{formatZar(client.monthlyFee)}</span>
              </div>
            </div>
          </div>
          
          {client.notes && !isEditing && (
             <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/10">
               <h3 className="font-display font-semibold flex items-center mb-3"><FileText className="w-4 h-4 mr-2" /> Notes</h3>
               <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
             </div>
          )}
        </div>

        {/* Right Column - Form / Details */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
            <div className="p-6 border-b border-border/50 bg-secondary/20 flex justify-between items-center">
              <h3 className="font-display font-semibold text-lg">Contact & Location</h3>
              {isEditing && (
                <button onClick={() => setIsEditing(false)} className="p-1 rounded-md hover:bg-background text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-medium text-primary">Service Info</label>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">SIP Extensions</label>
                    <input {...form.register("sipExtensions")} type="number" className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Monthly Fee (ZAR)</label>
                    <input {...form.register("monthlyFee")} type="number" step="0.01" className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Status</label>
                    <select {...form.register("status")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none">
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2 pt-4 border-t border-border">
                    <label className="text-sm font-medium text-primary">Profile Info</label>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Company Name</label>
                    <input {...form.register("companyName")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Contact Name</label>
                    <input {...form.register("contactName")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Email</label>
                    <input {...form.register("email")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Phone</label>
                    <input {...form.register("phone")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Unit / Street Number</label>
                    <input {...form.register("unitStreetNumber")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. Unit 4 / 12" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Building / Complex</label>
                    <input {...form.register("buildingComplex")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. Sunridge Business Park" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-medium">Street Name</label>
                    <input {...form.register("streetName")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. Main Road" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-medium">Address Line 2 <span className="text-muted-foreground font-normal text-xs">(optional)</span></label>
                    <input {...form.register("address2")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. Industrial area" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">City</label>
                    <input {...form.register("city")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Province</label>
                    <select {...form.register("province")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none">
                      <option value="">Select Province...</option>
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-medium">Notes</label>
                    <textarea {...form.register("notes")} rows={3} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none resize-none"></textarea>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-border">
                  <button type="submit" disabled={updateMutation.isPending} className="flex items-center px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl shadow-lg shadow-primary/20 transition-all">
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center mb-1"><Building className="w-4 h-4 mr-2" /> Contact Name</dt>
                    <dd className="text-base font-medium">{client.contactName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center mb-1"><Mail className="w-4 h-4 mr-2" /> Email Address</dt>
                    <dd className="text-base font-medium">{client.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center mb-1"><Phone className="w-4 h-4 mr-2" /> Phone Number</dt>
                    <dd className="text-base font-medium">{client.phone || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center mb-1"><MapPin className="w-4 h-4 mr-2" /> Address</dt>
                    <dd className="text-base font-medium leading-relaxed">
                      {(() => {
                        const c = client as any;
                        const lines = [
                          [c.unitStreetNumber, c.buildingComplex].filter(Boolean).join(", "),
                          c.streetName,
                          c.address2,
                          [c.city, c.province].filter(Boolean).join(", "),
                        ].filter(Boolean);
                        return lines.length > 0 ? lines.map((l, i) => <span key={i} className="block">{l}</span>) : "Not provided";
                      })()}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Services Section */}
      <div className="mt-8">
        <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
          <div className="p-6 border-b border-border/50 bg-secondary/20 flex items-center justify-between">
            <h3 className="font-display font-semibold text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Active Services
            </h3>
            <Link
              href="/reseller/orders/new"
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" /> Place Order
            </Link>
          </div>

          {servicesLoading ? (
            <div className="flex justify-center p-8">
              <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeServices.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <Activity className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-muted-foreground text-sm">No active services</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                When you place a completed order assigned to this client, their services will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Service</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Qty</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Unit Price (incl. VAT)</th>
                    <th className="text-right px-6 py-3 font-medium text-muted-foreground">Since</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {activeServices.map(item => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium">{item.name}</div>
                        {item.sku && <div className="text-xs text-muted-foreground mt-0.5">{item.sku}</div>}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          {itemTypeIcon(item.itemType)} {itemTypeLabel(item.itemType)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-muted-foreground">{item.quantity}</td>
                      <td className="px-4 py-4 text-right font-semibold">{formatZar(Number(item.unitPriceInclVat))}</td>
                      <td className="px-6 py-4 text-right text-muted-foreground text-xs">
                        {format(new Date(item.createdAt), "d MMM yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border/50 bg-muted/20">
                  <tr>
                    <td colSpan={3} className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      {activeServices.length} active item{activeServices.length !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary">
                      {formatZar(activeServices.reduce((sum, i) => sum + Number(i.unitPriceInclVat) * i.quantity, 0))}
                    </td>
                    <td className="px-6 py-3 text-right text-xs text-muted-foreground">/month</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

    </AppLayout>
  );
}
