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
    request.onsuccess = () => {
      const db = request.result;
      // iOS drops the connection after the app sits in the background; a newer version in
      // another tab asks us to close. Either way, forget it so the next call reopens.
      const forget = () => {
        db.close();
        connection = null;
      };
      db.onclose = forget;
      db.onversionchange = forget;
      resolve(db);
    };
    request.onerror = () => {
      connection = null;
      reject(request.error);
    };
    request.onblocked = () => {
      connection = null;
      reject(new DOMException('database upgrade blocked by another tab', 'InvalidStateError'));
    };
  });
  return connection;
};

const isStaleConnection = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'InvalidStateError';

/** Runs `operation` on an open database, reopening once if the cached connection died. */
const withDatabase = async <T>(operation: (db: IDBDatabase) => Promise<T>): Promise<T> => {
  try {
    return await operation(await open());
  } catch (error) {
    if (!isStaleConnection(error)) throw error;
    connection = null;
    return operation(await open());
  }
};

const settle = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const done = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    // During `error` the transaction's own error is still null; the request carries it.
    transaction.onerror = (event) => reject((event.target as IDBRequest | null)?.error ?? transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new DOMException('aborted', 'AbortError'));
  });

export const read = <T>(store: StoreName, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
  withDatabase((db) => settle(run(db.transaction(store, 'readonly').objectStore(store))));

/** Runs writes across stores in one transaction, resolving when it commits. */
export const write = (stores: StoreName[], run: (tx: IDBTransaction) => void): Promise<void> =>
  withDatabase((db) => {
    const transaction = db.transaction(stores, 'readwrite');
    try {
      run(transaction);
    } catch (error) {
      // A synchronous throw (e.g. DataCloneError) must not commit the writes queued before it.
      transaction.abort();
      throw error;
    }
    return done(transaction);
  });

export const isQuotaError = (error: unknown): boolean =>
  error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22);
