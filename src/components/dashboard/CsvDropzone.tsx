import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, Sparkles } from "lucide-react";
import { parseCsv, type BugRow } from "@/lib/bug-data";
import { toast } from "sonner";

interface Props {
  onLoaded: (rows: BugRow[], filename: string) => void;
}

export function CsvDropzone({ onLoaded }: Props) {
  const [drag, setDrag] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const rows = parseCsv(text);
        if (!rows.length) {
          toast.error("No valid rows found in CSV");
          return;
        }
        onLoaded(rows, file.name);
        toast.success(`Loaded ${rows.length} bugs from ${file.name}`);
      } catch (e) {
        toast.error("Failed to parse CSV");
        console.error(e);
      }
    },
    [onLoaded],
  );

  return (
    <div className="relative">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -inset-20 -z-10 opacity-60 blur-3xl">
        <div className="absolute left-1/4 top-1/2 h-64 w-64 rounded-full bg-primary/30" />
        <div className="absolute right-1/4 top-1/4 h-64 w-64 rounded-full bg-accent/20" />
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        className={`group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed p-14 text-center transition-all ${
          drag
            ? "scale-[1.01] border-primary bg-primary/10 shadow-[var(--shadow-glow)]"
            : "border-border/60 bg-card/40 hover:border-primary/60 hover:bg-card"
        }`}
      >
        {/* Animated grid backdrop */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.97 0.01 250) 1px, transparent 1px), linear-gradient(90deg, oklch(0.97 0.01 250) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />

        <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--gradient-primary)] shadow-[var(--shadow-glow)] transition-transform group-hover:scale-105">
          <Upload className="h-8 w-8 text-primary-foreground" />
          <Sparkles className="absolute -right-2 -top-2 h-4 w-4 text-accent animate-pulse" />
        </div>

        <p className="font-display text-2xl font-semibold tracking-tight">
          Drop your Jira export
        </p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Drag a CSV here — or click to browse. We'll compute leakage, severity, and MTTR instantly.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
          <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
          .csv · runs locally · nothing uploaded
        </div>
      </label>
    </div>
  );
}
