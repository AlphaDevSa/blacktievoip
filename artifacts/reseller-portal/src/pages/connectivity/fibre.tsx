import { AppLayout } from "@/components/layout/AppLayout";
import { Cable } from "lucide-react";

const FIBRE_SRCDOC = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>body{margin:0;padding:0;overflow:hidden;}</style>
</head>
<body>
<script type="text/javascript">
(function(){
  var ax=document.createElement('script');
  ax.id='mainscript';
  ax.type='text/javascript';
  ax.async=true;
  ax.src='https://rcp.axxess.co.za/public/js/fibremapJs.php?key=${import.meta.env.VITE_AXXESS_MAP_KEY}&width=100%&height=520px';
  var s=document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(ax,s);
})();
<\/script>
</body>
</html>`;

function FibreCoverageContent({ role }: { role: "admin" | "reseller" }) {
  return (
    <AppLayout role={role} title="Fibre Coverage Check">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center gap-3 bg-muted/20">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Cable className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-foreground">Fibre Coverage Map</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enter an address below to check fibre availability in that area.
              </p>
            </div>
          </div>
          <div className="p-4">
            <iframe
              srcDoc={FIBRE_SRCDOC}
              className="w-full border-0 rounded-xl"
              style={{ height: "540px" }}
              title="Fibre Coverage Map"
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export function AdminFibreCoverage() {
  return <FibreCoverageContent role="admin" />;
}

export function ResellerFibreCoverage() {
  return <FibreCoverageContent role="reseller" />;
}
