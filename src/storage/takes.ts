/** Take metadata and videos in IndexedDB (videos are too big for localStorage). */
import type { Take } from '../domain/take';
import { read, STORES, write } from './idb';

export const listTakes = async (scriptId: string): Promise<Take[]> => {
  const takes = await read<Take[]>(STORES.takes, (store) => store.index('scriptId').getAll(scriptId));
  return takes.sort((a, b) => a.number - b.number);
};

export const saveTake = (take: Take, video?: Blob): Promise<void> =>
  write([STORES.takes, STORES.videos], (tx) => {
    tx.objectStore(STORES.takes).put(take);
    if (video) tx.objectStore(STORES.videos).put(video, take.id);
  });

export const updateTake = (take: Take): Promise<void> =>
  write([STORES.takes], (tx) => {
    tx.objectStore(STORES.takes).put(take);
  });

export const getVideo = (takeId: string): Promise<Blob | undefined> =>
  read<Blob | undefined>(STORES.videos, (store) => store.get(takeId));

export const deleteTake = (takeId: string): Promise<void> =>
  write([STORES.takes, STORES.videos], (tx) => {
    tx.objectStore(STORES.takes).delete(takeId);
    tx.objectStore(STORES.videos).delete(takeId);
  });

export const deleteTakesOf = async (scriptId: string): Promise<void> => {
  const takes = await listTakes(scriptId);
  await write([STORES.takes, STORES.videos], (tx) => {
    for (const take of takes) {
      tx.objectStore(STORES.takes).delete(take.id);
      tx.objectStore(STORES.videos).delete(take.id);
    }
  });
};

/** Asks the browser not to evict our data; best effort, mostly honored for installed PWAs. */
export const requestPersistence = async (): Promise<boolean> => {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
};
