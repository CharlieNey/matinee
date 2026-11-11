/** Diary photos live outside localStorage so a handful of images cannot
 * exhaust the tiny synchronous storage quota and strand all other state. */

const DATABASE = "matinee-diary";
const STORE = "photos";
const VERSION = 1;

let connection: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is unavailable"));
  }
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Photo storage failed"));
    request.onblocked = () => reject(new Error("Photo storage upgrade was blocked"));
  });
  return connection;
}

function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Photo transaction failed"));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Photo transaction was aborted"));
  });
}

export async function readDiaryPhotos(
  ids: readonly string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const database = await openDatabase();
  const transaction = database.transaction(STORE, "readonly");
  const store = transaction.objectStore(STORE);
  const pairs = await Promise.all(
    ids.map(
      (id) =>
        new Promise<[string, string | null]>((resolve, reject) => {
          const request = store.get(id);
          request.onsuccess = () =>
            resolve([id, typeof request.result === "string" ? request.result : null]);
          request.onerror = () => reject(request.error);
        }),
    ),
  );
  await completed(transaction);
  return new Map(pairs.filter((pair): pair is [string, string] => pair[1] !== null));
}

export async function writeDiaryPhoto(
  id: string,
  value: string | null,
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE, "readwrite");
  const store = transaction.objectStore(STORE);
  if (value) store.put(value, id);
  else store.delete(id);
  await completed(transaction);
}

export async function deleteDiaryPhoto(id: string): Promise<void> {
  return writeDiaryPhoto(id, null);
}

export async function clearDiaryPhotos(): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE, "readwrite");
  transaction.objectStore(STORE).clear();
  await completed(transaction);
}

export async function replaceDiaryPhotos(
  entries: ReadonlyArray<{ id: string; photo: string | null }>,
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE, "readwrite");
  const store = transaction.objectStore(STORE);
  store.clear();
  for (const entry of entries) {
    if (entry.photo) store.put(entry.photo, entry.id);
  }
  await completed(transaction);
}
