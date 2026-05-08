import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { get, set, del } from "idb-keyval";
import { parseCsv, type BugRow } from "./bug-data";

// Keys are versioned so we can change the stored shape without blowing up
// existing users — just bump the suffix and write a migration if needed.
const ROWS_KEY = "bqd:rows-v1";
const META_KEY = "bqd:meta-v1";

// URL of the auto-loaded CSV snapshot. Lives in public/data/ in the repo and
// is served at /data/latest.csv by the deployed Worker. Refresh by replacing
// the file and redeploying — no R2/KV/external storage required.
const FEED_URL = "/data/latest.csv";

/** Where the currently-loaded data set came from. */
export type DataSource = "feed" | "upload";

interface StoredMeta {
  filename: string;
  updatedAt: number;
  rowCount: number;
  source: DataSource;
}

interface BugStore {
  /** Parsed bug rows — empty until a CSV is loaded (or rehydrated from IDB). */
  rows: BugRow[];
  /** Last loaded filename, for display. */
  filename: string;
  /** When the current data set was loaded (epoch ms). null if no data. */
  loadedAt: number | null;
  /** Where this data set came from. null while still loading. */
  source: DataSource | null;
  /**
   * False until the IndexedDB hydration + (optional) feed fetch have settled.
   * UI code uses this to avoid flashing the empty-state dropzone on a cold
   * load when data is actually about to arrive.
   */
  hydrated: boolean;
  setData: (rows: BugRow[], filename: string, source: DataSource) => void;
  reset: () => void;
}

const BugStoreContext = createContext<BugStore | null>(null);

// Re-instantiate Date fields after loading from IDB. structured-clone keeps
// Date as Date, but we're defensive in case somebody migrates from the older
// localStorage-based summary or pushes in JSON from elsewhere.
const reviveRow = (r: BugRow): BugRow => ({
  ...r,
  created: r.created instanceof Date ? r.created : new Date(r.created as unknown as string),
  resolved: r.resolved
    ? r.resolved instanceof Date
      ? r.resolved
      : new Date(r.resolved as unknown as string)
    : null,
});

export function BugStoreProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<BugRow[]>([]);
  const [filename, setFilename] = useState("");
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [source, setSource] = useState<DataSource | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // On mount: rehydrate from IDB, then optionally refresh from the data feed.
  // Rules:
  //   - If IDB has user-uploaded data, keep it (user explicitly chose this CSV
  //     and probably wants it across reloads).
  //   - Otherwise, try fetching /data/latest.csv. If that succeeds, use it.
  //   - If both fail, leave empty so the dropzone shows.
  useEffect(() => {
    let cancelled = false;

    const applyStored = (storedRows: BugRow[], meta: StoredMeta) => {
      setRows(storedRows.map(reviveRow));
      setFilename(meta.filename ?? "");
      setLoadedAt(meta.updatedAt ?? null);
      setSource(meta.source ?? "upload"); // legacy meta defaults to upload
    };

    const fetchFeed = async (): Promise<boolean> => {
      try {
        const res = await fetch(FEED_URL, { cache: "no-store" });
        if (!res.ok) return false;
        const text = await res.text();
        const parsed = parseCsv(text);
        if (cancelled) return false;
        if (parsed.length === 0) return false;
        const now = Date.now();
        setRows(parsed);
        setFilename("latest.csv (data feed)");
        setLoadedAt(now);
        setSource("feed");
        const meta: StoredMeta = {
          filename: "latest.csv (data feed)",
          updatedAt: now,
          rowCount: parsed.length,
          source: "feed",
        };
        // Persist the feed in IDB too so a second-tab open or offline reload
        // still has data; next visit will re-fetch and overwrite.
        void set(ROWS_KEY, parsed).catch(() => {});
        void set(META_KEY, meta).catch(() => {});
        return true;
      } catch {
        return false;
      }
    };

    (async () => {
      try {
        const [storedRows, storedMeta] = await Promise.all([
          get<BugRow[]>(ROWS_KEY),
          get<StoredMeta>(META_KEY),
        ]);
        if (cancelled) return;

        // Honour user uploads — they win over the feed.
        if (storedMeta?.source === "upload" && Array.isArray(storedRows) && storedRows.length > 0) {
          applyStored(storedRows, storedMeta);
          return;
        }

        // Try the feed.
        const fed = await fetchFeed();
        if (cancelled) return;
        if (fed) return;

        // Feed failed — fall back to anything that was in IDB.
        if (Array.isArray(storedRows) && storedRows.length > 0 && storedMeta) {
          applyStored(storedRows, storedMeta);
        }
      } catch (err) {
        // Don't block the UI if IDB is unavailable (private mode, etc).
        console.warn("bug-store: hydrate failed", err);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setData = useCallback((next: BugRow[], name: string, src: DataSource) => {
    const now = Date.now();
    setRows(next);
    setFilename(name);
    setLoadedAt(now);
    setSource(src);
    const meta: StoredMeta = {
      filename: name,
      updatedAt: now,
      rowCount: next.length,
      source: src,
    };
    // Fire-and-forget persistence — UI already updated.
    void set(ROWS_KEY, next).catch((err) => console.warn("bug-store: persist rows failed", err));
    void set(META_KEY, meta).catch((err) => console.warn("bug-store: persist meta failed", err));
  }, []);

  const reset = useCallback(() => {
    setRows([]);
    setFilename("");
    setLoadedAt(null);
    setSource(null);
    void del(ROWS_KEY).catch(() => {});
    void del(META_KEY).catch(() => {});
  }, []);

  const value = useMemo<BugStore>(
    () => ({ rows, filename, loadedAt, source, hydrated, setData, reset }),
    [rows, filename, loadedAt, source, hydrated, setData, reset],
  );

  return <BugStoreContext.Provider value={value}>{children}</BugStoreContext.Provider>;
}

export function useBugStore(): BugStore {
  const ctx = useContext(BugStoreContext);
  if (!ctx) {
    throw new Error("useBugStore must be used within <BugStoreProvider>");
  }
  return ctx;
}
