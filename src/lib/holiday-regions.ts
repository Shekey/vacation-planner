import type { Locale } from "@/lib/i18n/config";

/** Countries date.nager.at has public holidays for (ISO 3166-1 alpha-2). */
export const HOLIDAY_COUNTRIES = [
  "AD", "AL", "AM", "AR", "AT", "AU", "AX", "BA", "BB", "BE", "BG", "BJ", "BO", "BR", "BS", "BW", "BY", "BZ",
  "CA", "CH", "CL", "CN", "CO", "CR", "CU", "CY", "CZ", "DE", "DK", "DO", "EC", "EE", "EG", "ES", "FI", "FO",
  "FR", "GA", "GB", "GD", "GE", "GG", "GI", "GL", "GM", "GR", "GT", "GY", "HK", "HN", "HR", "HT", "HU", "ID",
  "IE", "IM", "IS", "IT", "JE", "JM", "JP", "KR", "KZ", "LI", "LS", "LT", "LU", "LV", "MA", "MC", "MD", "ME",
  "MG", "MK", "MN", "MS", "MT", "MX", "MZ", "NA", "NE", "NG", "NI", "NL", "NO", "NZ", "PA", "PE", "PG", "PH",
  "PL", "PR", "PT", "PY", "RO", "RS", "RU", "SE", "SG", "SI", "SJ", "SK", "SM", "SR", "SV", "TN", "TR", "UA",
  "US", "UY", "VA", "VE", "VN", "ZA", "ZW",
] as const;

const r = (country: string, entries: Record<string, string>) =>
  Object.entries(entries).map(([code, name]) => ({ code: `${country}-${code}`, name }));

/**
 * Regions with their own public holidays, keyed by country. Codes are ISO 3166-2,
 * which is what date.nager.at lists in a regional holiday's `counties`.
 */
export const HOLIDAY_REGIONS: Record<string, { code: string; name: string }[]> = {
  BA: r("BA", { BIH: "Federation of Bosnia and Herzegovina", SRP: "Republika Srpska", BRC: "Brčko District" }),
  DE: r("DE", {
    BW: "Baden-Württemberg", BY: "Bavaria", BE: "Berlin", BB: "Brandenburg", HB: "Bremen", HH: "Hamburg", HE: "Hesse",
    MV: "Mecklenburg-Vorpommern", NI: "Lower Saxony", NW: "North Rhine-Westphalia", RP: "Rhineland-Palatinate",
    SL: "Saarland", SN: "Saxony", ST: "Saxony-Anhalt", SH: "Schleswig-Holstein", TH: "Thuringia",
  }),
  AT: r("AT", {
    "1": "Burgenland", "2": "Carinthia", "3": "Lower Austria", "4": "Upper Austria", "5": "Salzburg", "6": "Styria",
    "7": "Tyrol", "8": "Vorarlberg", "9": "Vienna",
  }),
  CH: r("CH", {
    AG: "Aargau", AI: "Appenzell Innerrhoden", AR: "Appenzell Ausserrhoden", BE: "Bern", BL: "Basel-Landschaft",
    BS: "Basel-Stadt", FR: "Fribourg", GE: "Geneva", GL: "Glarus", GR: "Graubünden", JU: "Jura", LU: "Lucerne",
    NE: "Neuchâtel", NW: "Nidwalden", OW: "Obwalden", SG: "St. Gallen", SH: "Schaffhausen", SO: "Solothurn",
    SZ: "Schwyz", TG: "Thurgau", TI: "Ticino", UR: "Uri", VD: "Vaud", VS: "Valais", ZG: "Zug", ZH: "Zurich",
  }),
  GB: r("GB", { ENG: "England", SCT: "Scotland", WLS: "Wales", NIR: "Northern Ireland" }),
  ES: r("ES", {
    AN: "Andalusia", AR: "Aragon", AS: "Asturias", IB: "Balearic Islands", PV: "Basque Country", CN: "Canary Islands",
    CB: "Cantabria", CL: "Castile and León", CM: "Castilla–La Mancha", CT: "Catalonia", CE: "Ceuta", EX: "Extremadura",
    GA: "Galicia", RI: "La Rioja", MD: "Madrid", ML: "Melilla", MC: "Murcia", NC: "Navarre", VC: "Valencia",
  }),
  AU: r("AU", {
    ACT: "Australian Capital Territory", NSW: "New South Wales", NT: "Northern Territory", QLD: "Queensland",
    SA: "South Australia", TAS: "Tasmania", VIC: "Victoria", WA: "Western Australia",
  }),
  CA: r("CA", {
    AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick", NL: "Newfoundland and Labrador",
    NS: "Nova Scotia", NT: "Northwest Territories", NU: "Nunavut", ON: "Ontario", PE: "Prince Edward Island",
    QC: "Quebec", SK: "Saskatchewan", YT: "Yukon",
  }),
  US: r("US", {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
    DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
    IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
    MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
    NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
    NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
    RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
    VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  }),
};

export function isHolidayCountry(code: string): boolean {
  return (HOLIDAY_COUNTRIES as readonly string[]).includes(code);
}

/** A region is valid when it is listed for that country. */
export function isHolidayRegion(country: string, region: string): boolean {
  return HOLIDAY_REGIONS[country]?.some((r) => r.code === region) ?? false;
}

export function countryName(code: string, locale: Locale = "en"): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** German names where they differ from the English ones; other regions keep their English or local name. */
const GERMAN_REGION_NAMES: Record<string, string> = {
  "BA-BIH": "Föderation Bosnien und Herzegowina",
  "BA-BRC": "Distrikt Brčko",
  "DE-BY": "Bayern",
  "DE-HE": "Hessen",
  "DE-NI": "Niedersachsen",
  "DE-NW": "Nordrhein-Westfalen",
  "DE-RP": "Rheinland-Pfalz",
  "DE-SN": "Sachsen",
  "DE-ST": "Sachsen-Anhalt",
  "DE-TH": "Thüringen",
  "AT-2": "Kärnten",
  "AT-3": "Niederösterreich",
  "AT-4": "Oberösterreich",
  "AT-6": "Steiermark",
  "AT-7": "Tirol",
  "AT-9": "Wien",
  "CH-FR": "Freiburg",
  "CH-GE": "Genf",
  "CH-LU": "Luzern",
  "CH-NE": "Neuenburg",
  "CH-TI": "Tessin",
  "CH-VD": "Waadt",
  "CH-VS": "Wallis",
  "CH-ZH": "Zürich",
  "GB-SCT": "Schottland",
  "GB-NIR": "Nordirland",
};

/** A region's name in that language, e.g. "DE-NW" → "Nordrhein-Westfalen" in German. */
export function regionName(code: string, locale: Locale = "en"): string {
  if (locale === "de" && GERMAN_REGION_NAMES[code]) return GERMAN_REGION_NAMES[code];
  const country = code.split("-")[0];
  return HOLIDAY_REGIONS[country]?.find((r) => r.code === code)?.name ?? code;
}

/** A country's regions with names in that language, sorted for a picker. */
export function regionsOf(country: string, locale: Locale = "en"): { code: string; name: string }[] {
  return (HOLIDAY_REGIONS[country] ?? [])
    .map((r) => ({ code: r.code, name: regionName(r.code, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}
