/**
 * NWC (NIP-47) method parameter and result types
 */

export interface NwcGetInfoParams {
  // get_info has no parameters
}

export interface NwcGetInfoResult {
  alias?: string
  color?: string
  pubkey?: string
  network?: string
  block_height?: number
  block_hash?: string
  methods?: string[]
}

export interface NwcPayInvoiceParams {
  invoice: string
  amountSats?: number
}

export interface NwcPayInvoiceResult {
  preimage: string
  fees_paid?: number
}

export interface NwcMakeInvoiceParams {
  amount: number
  description?: string
  description_hash?: string
  expiry?: number
}

export interface NwcMakeInvoiceResult {
  type: string
  invoice: string
  description?: string
  description_hash?: string
  preimage: string
  payment_hash: string
  amount: number
  fees_paid: number
  created_at: number
  expires_at?: number
  metadata?: Record<string, unknown>
}

export interface NwcLookupInvoiceParams {
  payment_hash?: string
  invoice?: string
}

export interface NwcLookupInvoiceResult {
  type: string
  invoice: string
  description?: string
  description_hash?: string
  preimage?: string
  payment_hash: string
  amount: number
  fees_paid: number
  created_at: number
  expires_at?: number
  settled_at?: number
  metadata?: Record<string, unknown>
}
