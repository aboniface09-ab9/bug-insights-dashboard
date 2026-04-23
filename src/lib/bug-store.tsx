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
import type { BugRow } from "./bug-data";

// Keys are versioned so we can change the stored shape without blowing up
// existing users — just bump the suffix and write a migration if needed.
const ROWS_KEY = "bqd:rows-v1";
const META_KEY = "bqd:meta-v1";

interface StoredMeta {
  filename: string;
  updatedAt: number;
  rowCount: number;
}

interface BugStore {
  /** Parsed bug rows — empty until a CSV is loaded (or rehydrated from IDB). */
  rows: BugRow[];
  /** Last loaded filename, for display. */
  filename: string;
  /** When the current data set was loaded (epoch ms). null if no data. */
  loadedAt: number | null;
  /**
   * False until the IndexedDB hydration promise has resolved. UI code can use
   * this to avoid flashing the empty-state dropzone on a cold load when data
   * is actually about to arrive from IDB.
   */
  hydrated: boolean;
  setData: (rows: BugRow[], filename: string) => void;
  reset: () => void;
}

const BugStoreContext = createContext<BugStore | null>(null);

// Re-instantiate Date fields after loading from IDB. structured-clone keeps
// Date as Date, but we're defensive in case somebody migrates from the older
// localStorage-based summary or pushes in JSON from elsewhere.
const reviveRow = (r: BugRow): BugRow => ({
  ...r,
  created:
    r.created instanceof Date ? r.created : new Date(r.created as unknown as string),
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
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate from IndexedDB once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storedRows, storedMeta] = await Promise.all([
          get<BugRow[]>(ROWS_KEY),
          get<StoredMeta>(META_KEY),
        ]);
        if (cancelled) return;
        if (Array.isArray(storedRows) && storedRows.length > 0) {
          setRows(storedRows.map(reviveRow));
        }
        if (storedMeta) {
          setFilename(storedMeta.filename ?? "");
          setLoadedAt(storedMeta.updatedAt ?? null);
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

  const setData = useCallback((next: BugRow[], name: string) => {
    const now = Date.now();
    setRows(next);
    setFilename(name);
    setLoadedAt(now);
    const meta: StoredMeta = { filename: name, updatedAt: now, rowCount: next.length };
    // Fire-and-forget persistence — UI already updated.
    void set(ROWS_KEY, next).catch((err) =>
      console.warn("bug-store: persist rows failed", err),
    );
    void set(META_KEY, meta).catch((err) =>
      console.warn("bug-store: persist meta failed", err),
    );
  }, []);

  const reset = useCallback(() => {
    setRows([]);
    setFilename("");
    setLoadedAt(null);
    void del(ROWS_KEY).catch(() => {});
    void del(META_KEY).catch(() => {});
  }, []);

  const value = useMemo<BugStore>(
    () => ({ rows, filename, loadedAt, hydrated, setData, reset }),
    [rows, filename, loadedAt, hydrated, setData, reset],
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
