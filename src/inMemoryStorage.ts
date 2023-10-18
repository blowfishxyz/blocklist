import { BlowfishBlocklistStorage, BlowfishBlocklistStorageKey } from "./types";

export class InMemoryStorage implements BlowfishBlocklistStorage {
  private _storage: { [k in BlowfishBlocklistStorageKey]?: unknown } = {};

  async getItem<T>(key: BlowfishBlocklistStorageKey) {
    return this._storage[key] as T | undefined;
  }

  async setItem(key: BlowfishBlocklistStorageKey, data: unknown) {
    this._storage[key] = data;
  }
}
