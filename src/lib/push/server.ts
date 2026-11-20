import { supabaseAdmin } from "../supabaseAdmin";
import { RpcPushStore } from "./rpcStore";
import { MemoryPushStore, PushStore } from "./store";

/**
 * Server-only. Picks the push store: Supabase in production, or the
 * in-process store when PUSH_STORE=memory (local development; refused on
 * Vercel so a misconfigured deploy can't silently forget subscriptions).
 */

const globalStore = globalThis as typeof globalThis & {
  __matineeMemoryPushStore?: MemoryPushStore;
};

let rpcStore: RpcPushStore | null = null;

export function getPushStore(): PushStore | null {
  if (process.env.PUSH_STORE === "memory") {
    if (process.env.VERCEL) {
      console.error("PUSH_STORE=memory is ignored on Vercel");
    } else {
      // One instance per process, shared by every route bundle.
      globalStore.__matineeMemoryPushStore ??= new MemoryPushStore();
      return globalStore.__matineeMemoryPushStore;
    }
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    return null;
  }
  rpcStore ??= new RpcPushStore(async (fn, args) => {
    const { data, error } = await supabaseAdmin().rpc(fn, args);
    if (error) throw new Error(`${fn}: ${error.message}`);
    return data;
  });
  return rpcStore;
}
