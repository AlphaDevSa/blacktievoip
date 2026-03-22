import { AppLayout } from "@/components/layout/AppLayout";
import { useResellerGetProfile, useResellerUpdateProfile, getResellerGetProfileQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema } from "@/lib/schemas";
import { PROVINCES } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import * as z from "zod";
import { Save, Loader2, UserCircle } from "lucide-react";
import { useEffect } from "react";

type ProfileForm = z.infer<typeof updateProfileSchema>;

export default function ResellerProfile() {
  const { data: profile, isLoading } = useResellerGetProfile();
  const updateMutation = useResellerUpdateProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProfileForm>({
    resolver: zodResolver(updateProfileSchema),
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        companyName: profile.companyName,
        contactName: profile.contactName,
        email: profile.email || "",
        phone: profile.phone || "",
        unitStreetNumber: (profile as any).unitStreetNumber || "",
        buildingComplex: (profile as any).buildingComplex || "",
        streetName: (profile as any).streetName || "",
        address: profile.address || "",
        address2: (profile as any).address2 || "",
        city: profile.city || "",
        province: profile.province || "",
      });
    }
  }, [profile, form]);

  const onSubmit = async (data: ProfileForm) => {
    try {
      await updateMutation.mutateAsync({ data });
      queryClient.invalidateQueries({ queryKey: getResellerGetProfileQueryKey() });
      toast({ title: "Success", description: "Profile updated successfully." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update profile." });
    }
  };

  if (isLoading) {
    return (
      <AppLayout role="reseller" title="Company Profile">
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="reseller" title="Company Profile">
      <div className="max-w-3xl">
        <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
          <div className="p-8 border-b border-border/50 bg-secondary/20 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <UserCircle className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold">{profile?.companyName}</h2>
              <p className="text-muted-foreground">{profile?.email}</p>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">

            {/* Company Info */}
            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Company Name</label>
                  <input
                    {...form.register("companyName")}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                  {form.formState.errors.companyName && (
                    <p className="text-xs text-destructive">{form.formState.errors.companyName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Contact Name</label>
                  <input
                    {...form.register("contactName")}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                  {form.formState.errors.contactName && (
                    <p className="text-xs text-destructive">{form.formState.errors.contactName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email Address</label>
                  <input
                    {...form.register("email")}
                    type="email"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Phone Number</label>
                  <input
                    {...form.register("phone")}
                    type="tel"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Address Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Unit / Street Number</label>
                  <input
                    {...form.register("unitStreetNumber")}
                    placeholder="e.g. Unit 4 / 12"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Building / Complex</label>
                  <input
                    {...form.register("buildingComplex")}
                    placeholder="e.g. Sunridge Business Park"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium">Street Name</label>
                  <input
                    {...form.register("streetName")}
                    placeholder="e.g. Main Road"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium">Address Line 2 <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <input
                    {...form.register("address2")}
                    placeholder="e.g. Industrial area, Estate name"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">City</label>
                  <input
                    {...form.register("city")}
                    placeholder="e.g. Cape Town"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Province</label>
                  <select
                    {...form.register("province")}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none"
                  >
                    <option value="">Select Province...</option>
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex items-center px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-70 hover:-translate-y-0.5 active:translate-y-0"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                Save Profile Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
