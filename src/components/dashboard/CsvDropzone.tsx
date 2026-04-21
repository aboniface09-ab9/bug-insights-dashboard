import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
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
      className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
        drag
          ? "border-primary bg-primary/5"
          : "border-border/60 bg-card/40 hover:border-primary/60 hover:bg-card"
      }`}
    >
      <input
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--gradient-primary)] shadow-[var(--shadow-glow)]">
        <Upload className="h-7 w-7 text-primary-foreground" />
      </div>
      <p className="font-display text-lg font-semibold">Drop your Jira export here</p>
      <p className="mt-1 text-sm text-muted-foreground">
        or click to browse — CSV with Ticket ID, Created, Resolved, Severity, TJ Environment
      </p>
    </label>
  );
}
