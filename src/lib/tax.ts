// Stripe Tax needs ISO-2 country codes and (for the US) 2-letter state codes,
// but the delivery form collects free text. These maps normalize the common cases.

const US_STATES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC',
  florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL',
  indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
  pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
  tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA',
  washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
}

const COUNTRIES: Record<string, string> = {
  'united states': 'US', 'united states of america': 'US', usa: 'US', us: 'US', 'u.s.': 'US', 'u.s.a.': 'US',
  canada: 'CA', 'united kingdom': 'GB', uk: 'GB', 'great britain': 'GB', england: 'GB',
  australia: 'AU', ireland: 'IE', germany: 'DE', france: 'FR',
}

export function normalizeCountry(raw?: string): string {
  const v = (raw || '').trim()
  if (!v) return 'US'
  const mapped = COUNTRIES[v.toLowerCase()]
  if (mapped) return mapped
  if (v.length === 2) return v.toUpperCase()
  return v.toUpperCase()
}

export function normalizeState(raw: string | undefined, country: string): string | undefined {
  let s = (raw || '').trim()
  if (!s) return undefined
  if (country === 'US') {
    const mapped = US_STATES[s.toLowerCase()]
    if (mapped) return mapped
    if (s.length === 2) return s.toUpperCase()
  }
  return s
}

export type AddressInput = {
  addressLine1: string
  addressLine2?: string | null
  city: string
  state?: string | null
  postcode: string
  country?: string | null
}

// Shape an address for the Stripe Tax customer_details.address field.
export function toStripeTaxAddress(a: AddressInput) {
  const country = normalizeCountry(a.country ?? undefined)
  return {
    line1: a.addressLine1,
    line2: a.addressLine2 || undefined,
    city: a.city,
    state: normalizeState(a.state ?? undefined, country),
    postal_code: a.postcode,
    country,
  }
}
