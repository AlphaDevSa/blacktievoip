import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Building2, User, Mail, Phone, Calendar, CheckCircle2,
  XCircle, ClipboardList, AlertCircle, Search, Inbox,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Application {
  id: number;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Application card ──────────────────────────────────────────────────────────

function ApplicationCard({
  app,
  onApprove,
  onReject,
}: {
  app: Application;
  onApprove?: (app: Application) => void;
  onReject?: (app: Application) => void;
}) {
  const isPending = app.status === "pending";
  const isRejected = app.status === "rejected";

  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Avatar + details */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base truncate">{app.companyName}</h3>
                {isPending && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                    Pending Review
                  </Badge>
                )}
                {isRejected && (
                  <Badge variant="destructive" className="text-xs">
                    Rejected
                  </Badge>
                )}
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 flex-shrink-0" />
                  {app.contactName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <a href={`mailto:${app.email}`} className="hover:text-primary transition-colors truncate">
                    {app.email}
                  </a>
                </span>
                {app.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    {app.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  Applied {format(new Date(app.createdAt), "dd MMM yyyy, HH:mm")}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isPending && onApprove && onReject && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                onClick={() => onReject(app)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                onClick={() => onApprove(app)}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Approve
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Approve Dialog ─────────────────────────────────────────────────────────────

function ApproveDialog({
  app,
  open,
  onClose,
}: {
  app: Application | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/resellers/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      toast({
        title: "Application Approved",
        description: `${app?.companyName} has been approved and can now log in.`,
      });
      queryClient.invalidateQueries({ queryKey: ["reseller-applications"] });
      queryClient.invalidateQueries({ queryKey: ["reseller-applications-count"] });
      onClose();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Approve Application
          </DialogTitle>
          <DialogDescription>
            Approving <strong>{app?.companyName}</strong> will activate their account and allow them to log in as a reseller.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company</span>
              <span className="font-medium">{app?.companyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contact</span>
              <span className="font-medium">{app?.contactName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{app?.email}</span>
            </div>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => app && mutation.mutate(app.id)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Approving…" : "Approve & Activate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Reject Dialog ─────────────────────────────────────────────────────────────

function RejectDialog({
  app,
  open,
  onClose,
}: {
  app: Application | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/resellers/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      toast({
        title: "Application Rejected",
        description: `${app?.companyName}'s application has been rejected.`,
      });
      queryClient.invalidateQueries({ queryKey: ["reseller-applications"] });
      queryClient.invalidateQueries({ queryKey: ["reseller-applications-count"] });
      onClose();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Reject Application
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to reject <strong>{app?.companyName}</strong>'s application? 
            They will not be able to log in, and you can review rejected applications later.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => app && mutation.mutate(app.id)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Rejecting…" : "Reject Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Inbox className="w-10 h-10 mb-3 opacity-40" />
      <p className="font-medium">{message}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminResellerApplications() {
  const [search, setSearch] = useState("");
  const [approveTarget, setApproveTarget] = useState<Application | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Application | null>(null);

  const { data: applications = [], isLoading, isError } = useQuery<Application[]>({
    queryKey: ["reseller-applications"],
    queryFn: () => apiFetch("/api/admin/reseller-applications"),
    refetchInterval: 30_000,
  });

  const pending = applications.filter((a) => a.status === "pending");
  const rejected = applications.filter((a) => a.status === "rejected");

  const filtered = (list: Application[]) =>
    list.filter(
      (a) =>
        !search ||
        a.companyName.toLowerCase().includes(search.toLowerCase()) ||
        a.contactName.toLowerCase().includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <AppLayout role="admin" title="Reseller Applications">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Reseller Applications
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and action incoming reseller signup requests
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search applicants…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Summary banner */}
      {!isLoading && pending.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {pending.length} application{pending.length !== 1 ? "s" : ""} awaiting review
          </p>
        </div>
      )}

      {/* Content */}
      {isError ? (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 py-4 text-destructive">
            <AlertCircle className="w-4 h-4" />
            Failed to load applications. Please refresh.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending" className="gap-2">
              Pending Review
              {pending.length > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              Rejected
              {rejected.length > 0 && (
                <span className="bg-muted text-muted-foreground text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {rejected.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))
            ) : filtered(pending).length === 0 ? (
              <EmptyState
                message={
                  search
                    ? "No pending applications match your search"
                    : "No pending applications — all caught up!"
                }
              />
            ) : (
              filtered(pending).map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  onApprove={setApproveTarget}
                  onReject={setRejectTarget}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-3">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))
            ) : filtered(rejected).length === 0 ? (
              <EmptyState
                message={
                  search
                    ? "No rejected applications match your search"
                    : "No rejected applications"
                }
              />
            ) : (
              filtered(rejected).map((app) => (
                <ApplicationCard key={app.id} app={app} />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      <ApproveDialog
        app={approveTarget}
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
      />
      <RejectDialog
        app={rejectTarget}
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
      />
    </AppLayout>
  );
}
