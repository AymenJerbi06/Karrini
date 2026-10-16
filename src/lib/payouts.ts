"use client";

// The bank account (Tunisian RIB, 20 digits) where a teacher's monthly payout is transferred.
// Readable only by the teacher and Karrini admins.

import { supabase } from "@/lib/supabase/client";
import { announceChange, useRemote } from "@/lib/remote";

export type PayoutDetails = { holder: string; rib: string | null };

export function usePayoutDetails(teacherId: string | undefined) {
  return useRemote(
    teacherId ? `payout:${teacherId}` : null,
    async (): Promise<PayoutDetails | null> => {
      const { data, error } = await supabase().from("teacher_payouts").select("holder, rib").eq("teacher_id", teacherId!).maybeSingle();
      if (error) throw error;
      return data ? { holder: data.holder ?? "", rib: data.rib ?? null } : null;
    },
    null as PayoutDetails | null,
    "payout",
  );
}

export const cleanRib = (value: string) => value.replace(/\D/g, "");

export async function savePayoutDetails(teacherId: string, holder: string, rib: string) {
  const { error } = await supabase()
    .from("teacher_payouts")
    .upsert({ teacher_id: teacherId, holder: holder.trim().slice(0, 120), rib: cleanRib(rib) || null, updated_at: new Date().toISOString() });
  if (error) throw error;
  announceChange("payout");
}
