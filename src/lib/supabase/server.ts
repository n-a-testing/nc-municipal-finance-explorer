import "server-only"

import { createClient } from "@supabase/supabase-js"

import type { FinanceRow } from "@/lib/finance"

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    )
  }

  return { url, key }
}

export async function getMunicipalFinance(): Promise<FinanceRow[]> {
  const { url, key } = getConfig()
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase
    .from("municipal_finance")
    .select("*")
    .order("fiscal_year", { ascending: false })
    .order("municipality", { ascending: true })

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`)
  }

  return (data ?? []) as FinanceRow[]
}
