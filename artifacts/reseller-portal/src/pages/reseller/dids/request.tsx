import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useResellerGetAreaCodes, 
  useResellerGetAvailableDids,
  useResellerRequestDid,
  AreaCodeWithCount,
  Did
} from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, PhoneCall, CheckCircle2, ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function ResellerRequestDid() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: areaCodes = [], isLoading: loadingAC } = useResellerGetAreaCodes();
  const [selectedAreaCodeId, setSelectedAreaCodeId] = useState<number | null>(null);

  const { data: availableDids = [], isLoading: loadingDids } = useResellerGetAvailableDids(
    { areaCodeId: selectedAreaCodeId! },
    { query: { enabled: selectedAreaCodeId !== null } }
  );

  const requestDid = useResellerRequestDid();

  const handleRequest = async (didId: number, numberStr: string) => {
    try {
      await requestDid.mutateAsync({ id: didId });
      toast({ title: `Successfully claimed ${numberStr}` });
      queryClient.invalidateQueries({ queryKey: ["/api/reseller/area-codes"] });
      setLocation("/reseller/dids");
    } catch (err) {
      toast({ title: "Failed to claim DID", variant: "destructive" });
    }
  };

  return (
    <AppLayout role="reseller" title="Request New DID">
      <div className="max-w-5xl mx-auto">
        
        {/* Progress Tracker */}
        <div className="flex items-center justify-center mb-10">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold border-2 transition-colors ${!selectedAreaCodeId ? 'bg-primary text-primary-foreground border-primary' : 'bg-primary/20 text-primary border-primary'}`}>
              1
            </div>
            <div className="w-16 h-1 rounded-full bg-border overflow-hidden">
              <div className={`h-full bg-primary transition-all duration-500 ${selectedAreaCodeId ? 'w-full' : 'w-0'}`} />
            </div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold border-2 transition-colors ${selectedAreaCodeId ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border'}`}>
              2
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!selectedAreaCodeId ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-bold text-foreground">Select an Area Code</h2>
                <p className="text-muted-foreground mt-2">Choose the region where you need a new phone number.</p>
              </div>

              {loadingAC ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {areaCodes.map((ac: AreaCodeWithCount) => (
                    <button
                      key={ac.id}
                      onClick={() => ac.availableCount > 0 && setSelectedAreaCodeId(ac.id)}
                      disabled={ac.availableCount === 0}
                      className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border text-center transition-all duration-300 ${
                        ac.availableCount > 0 
                          ? "bg-card border-border hover:border-primary hover:shadow-lg hover:shadow-primary/10 cursor-pointer" 
                          : "bg-muted/10 border-border/50 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <MapPin className={`w-8 h-8 mb-3 ${ac.availableCount > 0 ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-3xl font-display font-bold text-foreground leading-none mb-1">{ac.code}</span>
                      <span className="text-sm font-medium text-muted-foreground mb-4">{ac.region}</span>
                      
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        ac.availableCount > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {ac.availableCount} Available
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            >
              <div className="flex items-center justify-between mb-8 bg-card border border-border p-4 rounded-2xl">
                <button 
                  onClick={() => setSelectedAreaCodeId(null)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-black/5 text-muted-foreground transition-colors font-medium text-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Area Codes
                </button>
                <div className="text-right">
                  <h2 className="text-xl font-display font-bold text-foreground">Choose Number</h2>
                  <p className="text-xs text-muted-foreground">Select from available numbers</p>
                </div>
              </div>

              {loadingDids ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
              ) : availableDids.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
                  <p className="text-muted-foreground">No numbers currently available in this area code.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableDids.map((did: Did, idx) => (
                    <div key={did.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between group hover:border-primary/50 transition-colors shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                          <PhoneCall className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-mono text-lg font-bold text-foreground tracking-wider">{did.number}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRequest(did.id, did.number)}
                        disabled={requestDid.isPending}
                        className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-semibold text-sm rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        Claim <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AppLayout>
  );
}
