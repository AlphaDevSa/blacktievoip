import { useRoute, Link } from "wouter";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatZar } from "@/lib/utils";
import { format } from "date-fns";
import { 
  useAdminGetReseller, 
  useAdminUpdateReseller, 
  useAdminDeleteReseller,
  getAdminGetResellerQueryKey,
  getAdminGetResellersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  ArrowLeft, Building, Mail, Phone, MapPin, 
  Wallet, Users, Calendar, Trash2, Edit3, Save, X 
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateResellerSchema } from "@/lib/schemas";
import { PROVINCES } from "@/lib/utils";
import * as z from "zod";

type FormValues = z.infer<typeof updateResellerSchema>;

export default function AdminResellerView() {
  const [, params] = useRoute("/admin/resellers/:id");
  const id = parseInt(params?.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: reseller, isLoading } = useAdminGetReseller(id);
  const updateMutation = useAdminUpdateReseller();
  const deleteMutation = useAdminDeleteReseller();

  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(updateResellerSchema),
    values: reseller ? {
      companyName: reseller.companyName,
      contactName: reseller.contactName,
      email: reseller.email,
      phone: reseller.phone || "",
      unitStreetNumber: (reseller as any).unitStreetNumber || "",
      buildingComplex: (reseller as any).buildingComplex || "",
      streetName: (reseller as any).streetName || "",
      address: reseller.address || "",
      address2: (reseller as any).address2 || "",
      city: reseller.city || "",
      province: reseller.province || "",
      status: reseller.status,
    } : undefined
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await updateMutation.mutateAsync({ id, data });
      queryClient.invalidateQueries({ queryKey: getAdminGetResellerQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getAdminGetResellersQueryKey() });
      toast({ title: "Success", description: "Reseller updated successfully." });
      setIsEditing(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error?.response?.data?.error || "Update failed." });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this reseller? This cannot be undone.")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getAdminGetResellersQueryKey() });
      toast({ title: "Deleted", description: "Reseller has been removed." });
      setLocation("/admin/resellers");
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete reseller." });
    }
  };

  if (isLoading || !reseller) {
    return (
      <AppLayout role="admin" title="Reseller Details">
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="admin" title={reseller.companyName}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <Link href="/admin/resellers" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Resellers
        </Link>
        {!isEditing && (
          <div className="flex gap-3">
            <button onClick={() => setIsEditing(true)} className="flex items-center px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-xl border border-border transition-all">
              <Edit3 className="w-4 h-4 mr-2" /> Edit Details
            </button>
            <button onClick={handleDelete} className="flex items-center px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white font-medium rounded-xl border border-destructive/20 transition-all">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Stats & Quick Info */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                <Building className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold">{reseller.companyName}</h2>
                <StatusBadge status={reseller.status} className="mt-1" />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center"><Users className="w-4 h-4 mr-2" /> Clients</span>
                <span className="font-semibold">{reseller.totalClients}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center"><Wallet className="w-4 h-4 mr-2" /> Revenue</span>
                <span className="font-semibold text-primary">{formatZar(reseller.monthlyRevenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center"><Calendar className="w-4 h-4 mr-2" /> Joined</span>
                <span className="font-semibold text-sm">{format(new Date(reseller.createdAt), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Form / Details */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
            <div className="p-6 border-b border-border/50 bg-secondary/20 flex justify-between items-center">
              <h3 className="font-display font-semibold text-lg">Profile Information</h3>
              {isEditing && (
                <button onClick={() => setIsEditing(false)} className="p-1 rounded-md hover:bg-background text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <label className="text-sm font-medium">Status</label>
                    <select {...form.register("status")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none">
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="pending">Pending</option>
                    </select>
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
                    <dd className="text-base font-medium">{reseller.contactName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center mb-1"><Mail className="w-4 h-4 mr-2" /> Email Address</dt>
                    <dd className="text-base font-medium">{reseller.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center mb-1"><Phone className="w-4 h-4 mr-2" /> Phone Number</dt>
                    <dd className="text-base font-medium">{reseller.phone || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center mb-1"><MapPin className="w-4 h-4 mr-2" /> Address</dt>
                    <dd className="text-base font-medium leading-relaxed">
                      {(() => {
                        const r = reseller as any;
                        const lines = [
                          [r.unitStreetNumber, r.buildingComplex].filter(Boolean).join(", "),
                          r.streetName,
                          r.address2,
                          [r.city, r.province].filter(Boolean).join(", "),
                        ].filter(Boolean);
                        return lines.length > 0 ? lines.map((l: string, i: number) => <span key={i} className="block">{l}</span>) : "Not provided";
                      })()}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
