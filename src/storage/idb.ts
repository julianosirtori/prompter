/** Minimal promise wrapper over IndexedDB; enough for two object stores. */

const DB_NAME = 'prompter';
const DB_VERSION = 1;
export const STORES = { takes: 'takes', videos: 'videos' } as const;
type StoreName = (typeof STORES)[keyof typeof STORES];

let connection: Promise<IDBDatabase> | null = null;

const open = (): Promise<IDBDatabase> => {
  connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.takes)) {
        db.createObjectStore(STORES.takes, { keyPath: 'id' }).createIndex('scriptId', 'scriptId');
      }
      if (!db.objectStoreNames.contains(STORES.videos)) db.createObjectStore(STORES.videos);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      connection = null;
      reject(request.error);
    };
  });
  return connection;
};

const settle = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const done = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new DOMException('aborted', 'AbortError'));
  });

export const read = async <T>(store: StoreName, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open();
  return settle(run(db.transaction(store, 'readonly').objectStore(store)));
};

/** Runs writes across stores in one transaction, resolving when it commits. */
export const write = async (stores: StoreName[], run: (tx: IDBTransaction) => void): Promise<void> => {
  const db = await open();
  const transaction = db.transaction(stores, 'readwrite');
  run(transaction);
  await done(transaction);
};

export const isQuotaError = (error: unknown): boolean =>
  error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22);
