import { AlertCircle, Landmark } from "lucide-react"

import { MunicipalWorkspace } from "@/components/dashboard/municipal-workspace"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getMunicipalFinance } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

async function loadFinanceData() {
  try {
    const data = await getMunicipalFinance()

    if (!data.length) {
      throw new Error("The municipal_finance table returned no rows.")
    }

    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "The data connection failed unexpectedly.",
    }
  }
}

export default async function Home() {
  const result = await loadFinanceData()

  if (result.data) {
    return <MunicipalWorkspace data={result.data} />
  }

  return (
      <main className="grid min-h-screen place-items-center bg-[#f6f8fb] p-6">
        <Card className="w-full max-w-xl bg-white">
          <CardHeader>
            <div className="mb-2 grid size-11 place-items-center rounded-xl bg-[#0b2239] text-white">
              <Landmark className="size-5" />
            </div>
            <CardTitle className="text-xl">NC Municipal Finance Explorer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-950">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div><strong>Could not load Supabase data.</strong><p className="mt-1 leading-6">{result.error}</p></div>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Copy <code>.env.example</code> to <code>.env.local</code>, set the project URL and publishable key, then restart the development server.
            </p>
          </CardContent>
        </Card>
      </main>
  )
}
