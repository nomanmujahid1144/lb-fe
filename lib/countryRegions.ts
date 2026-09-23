/**
 * Region ("EU", "Europe", "Asia", …) shortcuts for the company Country column
 * filters in the Master Database.
 *
 * `companies.country` holds ISO 3166-1 alpha-2 codes, so a region is just a
 * fixed set of codes — no schema or data migration needed. Regions are resolved
 * to plain country values in the UI (see ColumnFilterDropdown `expandsTo`), so
 * the backend keeps receiving a normal list of countries and every consumer of
 * that filter (table, export, assign, select-all-matching) works unchanged.
 *
 * Regions deliberately overlap where geography does: TR and RU appear under
 * Europe and Asia, and the Middle East is a subset of Asia. Selecting two
 * regions unions their countries, so an overlap can never lose rows.
 */

export const REGION_OPTION_PREFIX = '__region:';

interface RegionDefinition {
    /** Sentinel option value. Prefixed so it can never collide with a real
     *  country code — note `NA` is Namibia, not North America. */
    value: string;
    label: string;
    countries: string[];
}

/** Europe as a continent, including the transcontinental RU/TR and micro-states. */
const EUROPE = [
    'AD', 'AL', 'AT', 'AX', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES',
    'FI', 'FO', 'FR', 'GB', 'GG', 'GI', 'GR', 'HR', 'HU', 'IE', 'IM', 'IS', 'IT', 'JE', 'LI',
    'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'RU',
    'SE', 'SI', 'SJ', 'SK', 'SM', 'TR', 'UA', 'VA', 'XK',
];

/** The 27 European Union member states (post-Brexit — GB is not in here). */
const EUROPEAN_UNION = [
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE',
    'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
];

/** North America incl. Central America and the Caribbean. AN = retired Netherlands Antilles. */
const NORTH_AMERICA = [
    'AG', 'AI', 'AN', 'AW', 'BB', 'BL', 'BM', 'BQ', 'BS', 'BZ', 'CA', 'CR', 'CU', 'CW', 'DM',
    'DO', 'GD', 'GL', 'GP', 'GT', 'HN', 'HT', 'JM', 'KN', 'KY', 'LC', 'MF', 'MQ', 'MS', 'MX',
    'NI', 'PA', 'PM', 'PR', 'SV', 'SX', 'TC', 'TT', 'US', 'VC', 'VG', 'VI',
];

const SOUTH_AMERICA = [
    'AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'FK', 'GF', 'GS', 'GY', 'PE', 'PY', 'SR', 'UY', 'VE',
];

/** Asia as a continent — includes the Middle East and the Asian parts of RU/TR. */
const ASIA = [
    'AE', 'AF', 'AM', 'AZ', 'BD', 'BH', 'BN', 'BT', 'CC', 'CN', 'CX', 'CY', 'GE', 'HK', 'ID',
    'IL', 'IN', 'IQ', 'IR', 'JO', 'JP', 'KG', 'KH', 'KP', 'KR', 'KW', 'KZ', 'LA', 'LB', 'LK',
    'MM', 'MN', 'MO', 'MV', 'MY', 'NP', 'OM', 'PH', 'PK', 'PS', 'QA', 'RU', 'SA', 'SG', 'SY',
    'TH', 'TJ', 'TL', 'TM', 'TR', 'TW', 'UZ', 'VN', 'YE',
];

/** Western Asia + TR/CY — a subset of Asia, offered separately because it is a
 *  common sales region. */
const MIDDLE_EAST = [
    'AE', 'BH', 'CY', 'IL', 'IQ', 'IR', 'JO', 'KW', 'LB', 'OM', 'PS', 'QA', 'SA', 'SY', 'TR', 'YE',
];

const AFRICA = [
    'AO', 'BF', 'BI', 'BJ', 'BW', 'CD', 'CF', 'CG', 'CI', 'CM', 'CV', 'DJ', 'DZ', 'EG', 'EH',
    'ER', 'ET', 'GA', 'GH', 'GM', 'GN', 'GQ', 'GW', 'KE', 'KM', 'LR', 'LS', 'LY', 'MA', 'MG',
    'ML', 'MR', 'MU', 'MW', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SC', 'SD', 'SH', 'SL', 'SN',
    'SO', 'SS', 'ST', 'SZ', 'TD', 'TG', 'TN', 'TZ', 'UG', 'YT', 'ZA', 'ZM', 'ZW',
];

const OCEANIA = [
    'AS', 'AU', 'CK', 'FJ', 'FM', 'GU', 'KI', 'MH', 'MP', 'NC', 'NF', 'NR', 'NU', 'NZ', 'PF',
    'PG', 'PN', 'PW', 'SB', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS',
];

const REGION_DEFINITIONS: RegionDefinition[] = [
    { value: `${REGION_OPTION_PREFIX}eu`, label: 'EU (European Union)', countries: EUROPEAN_UNION },
    { value: `${REGION_OPTION_PREFIX}europe`, label: 'Europe (continent)', countries: EUROPE },
    { value: `${REGION_OPTION_PREFIX}north_america`, label: 'North America', countries: NORTH_AMERICA },
    { value: `${REGION_OPTION_PREFIX}south_america`, label: 'South America', countries: SOUTH_AMERICA },
    { value: `${REGION_OPTION_PREFIX}asia`, label: 'Asia', countries: ASIA },
    { value: `${REGION_OPTION_PREFIX}middle_east`, label: 'Middle East', countries: MIDDLE_EAST },
    { value: `${REGION_OPTION_PREFIX}africa`, label: 'Africa', countries: AFRICA },
    { value: `${REGION_OPTION_PREFIX}oceania`, label: 'Oceania', countries: OCEANIA },
];

/**
 * Non-ISO spellings that occur in the data (or plausibly will), mapped to their
 * code so a region still picks those rows up. Keys are upper-cased and trimmed.
 */
const COUNTRY_ALIASES: Record<string, string> = {
    NETHERLANDS: 'NL',
    NEDERLAND: 'NL',
    HOLLAND: 'NL',
    BELGIUM: 'BE',
    BELGIE: 'BE',
    'BELGIË': 'BE',
    GERMANY: 'DE',
    DEUTSCHLAND: 'DE',
    FRANCE: 'FR',
    SPAIN: 'ES',
    ITALY: 'IT',
    'UNITED KINGDOM': 'GB',
    UK: 'GB',
    ENGLAND: 'GB',
    'UNITED STATES': 'US',
    USA: 'US',
};

/** Canonical ISO code for a raw DB value, or null when it is not a country. */
const canonicalCountryCode = (raw: string): string | null => {
    const key = String(raw || '').trim().toUpperCase();
    if (!key) return null;
    if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key];
    return /^[A-Z]{2}$/.test(key) ? key : null;
};

export interface CountryFilterOption {
    value: string;
    label: string;
    /** Present on region rows: the actual country values this row stands for. */
    expandsTo?: string[];
    /** Region rows are rendered as a distinct group above the countries. */
    isGroup?: boolean;
}

/**
 * Build the option list for a company Country filter: region shortcuts first,
 * then the raw country values as they exist in the data.
 *
 * A region is only offered when the current data actually contains one of its
 * countries, and it expands to those raw values — so unmappable junk in the
 * column (`Test`, `OO`) simply never ends up under a region.
 */
export const buildCountryFilterOptions = (countries: string[]): CountryFilterOption[] => {
    const byCode = new Map<string, string[]>();
    for (const raw of countries) {
        const code = canonicalCountryCode(raw);
        if (!code) continue;
        const existing = byCode.get(code);
        if (existing) existing.push(raw);
        else byCode.set(code, [raw]);
    }

    const regionOptions: CountryFilterOption[] = [];
    for (const region of REGION_DEFINITIONS) {
        const expandsTo = region.countries.flatMap(code => byCode.get(code) || []);
        if (expandsTo.length === 0) continue;
        regionOptions.push({
            value: region.value,
            label: `${region.label} — ${expandsTo.length} countries`,
            expandsTo,
            isGroup: true,
        });
    }

    return [...regionOptions, ...countries.map(c => ({ value: c, label: c }))];
};