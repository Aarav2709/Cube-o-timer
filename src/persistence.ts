import { CURRENT_SCHEMA_VERSION, PersistedData } from "./types";

export interface PersistenceAdapter {
  load(): Promise<PersistedData>;
  save(data: PersistedData): Promise<void>;
}

export interface PersistenceConfig {
  indexedDbName?: string;
}

const DEFAULT_DB_NAME = "kubetimr";

const DEFAULT_DATA: PersistedData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  sessions: [],
  solves: [],
  splits: [],
  settings: undefined,
  activePuzzleId: undefined,
};

function validateSchema(data: PersistedData): PersistedData {
  if (data.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    console.warn(
      `Schema version mismatch: ${data.schemaVersion} vs ${CURRENT_SCHEMA_VERSION}. Using defaults.`,
    );
    return DEFAULT_DATA;
  }
  return { ...DEFAULT_DATA, ...data };
}

class IndexedDbAdapter implements PersistenceAdapter {
  private dbName: string;
  private storeName = "state";

  constructor(dbName?: string) {
    this.dbName = dbName ?? DEFAULT_DB_NAME;
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, CURRENT_SCHEMA_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private txn<T>(
    db: IDBDatabase,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, mode);
      const store = tx.objectStore(this.storeName);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async load(): Promise<PersistedData> {
    const db = await this.openDb();
    const data = await this.txn<PersistedData | undefined>(
      db,
      "readonly",
      (store) => store.get("data"),
    );
    db.close();
    if (!data) return DEFAULT_DATA;
    return validateSchema(data);
  }

  async save(data: PersistedData): Promise<void> {
    const db = await this.openDb();
    await this.txn(db, "readwrite", (store) => store.put(data, "data"));
    db.close();
  }
}

class LocalStorageAdapter implements PersistenceAdapter {
  private key: string;

  constructor(key?: string) {
    this.key = key ?? DEFAULT_DB_NAME;
  }

  async load(): Promise<PersistedData> {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return DEFAULT_DATA;
      const parsed = JSON.parse(raw);
      return validateSchema(parsed as PersistedData);
    } catch {
      return DEFAULT_DATA;
    }
  }

  async save(data: PersistedData): Promise<void> {
    localStorage.setItem(this.key, JSON.stringify(data));
  }
}

class MemoryAdapter implements PersistenceAdapter {
  private data: PersistedData = DEFAULT_DATA;

  async load(): Promise<PersistedData> {
    return this.data;
  }

  async save(data: PersistedData): Promise<void> {
    this.data = data;
  }
}

function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage !== null;
  } catch {
    return false;
  }
}

export function createPersistenceAdapter(
  config: PersistenceConfig = {},
): PersistenceAdapter {
  if (hasIndexedDb()) {
    return new IndexedDbAdapter(config.indexedDbName);
  }

  if (hasLocalStorage()) {
    return new LocalStorageAdapter(config.indexedDbName);
  }

  return new MemoryAdapter();
}

export async function loadPersistedData(
  config?: PersistenceConfig,
): Promise<PersistedData> {
  const adapter = createPersistenceAdapter(config);
  return adapter.load();
}

export async function savePersistedData(
  data: PersistedData,
  config?: PersistenceConfig,
): Promise<void> {
  const adapter = createPersistenceAdapter(config);
  await adapter.save(data);
}
