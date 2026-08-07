/**
 * Rebuilds public/logos/ and lib/company-logos.json from the opportunities sheet.
 *
 *   npm run logos
 *
 * Dev-only, run by hand after adding a company to the sheet. simple-icons is a
 * devDependency and never reaches the client; only the files written here ship,
 * so the page makes no external requests at runtime.
 *
 * Two sources, because neither covers the board alone. simple-icons has dropped
 * most large brands over redistribution policy (Adobe, Amazon, IBM, Oracle,
 * ServiceNow). Favicons cover those but come back at 16-32px for Intel, Oracle,
 * Palantir, Qualcomm and Cisco, which simple-icons still carries. So: vector
 * first, favicon second, monogram last.
 */
import { writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'fs';
import sharp from 'sharp';
import * as si from 'simple-icons';
import { __internal, SHEET_CSV_URL } from '../lib/opportunities';

type Icon = { title: string; slug: string; hex: string; path: string };

const ICONS = Object.entries(si).filter(([k]) => k.startsWith('si')).map(([, v]) => v as Icon);
const BY_SLUG = new Map(ICONS.map((i) => [i.slug, i]));
const BY_TITLE = new Map(ICONS.map((i) => [i.title.toLowerCase(), i]));

/** Below this a favicon upscale looks smeared; a clean monogram reads better. */
const MIN_PX = 48;

const OUT_DIR = 'public/logos';
const MAP_FILE = 'lib/company-logos.json';

/**
 * Sheet name -> the domain whose mark identifies it. Only needed for companies
 * simple-icons does not carry; add a line here when a new employer appears.
 */
const DOMAINS: Record<string, string> = {
  'Accenture': 'accenture.com', 'Adobe': 'adobe.com', 'Amazon': 'amazon.com',
  'Apple': 'apple.com', 'Atlassian': 'atlassian.com', 'Birlasoft': 'birlasoft.com',
  'Bloomberg': 'bloomberg.com', 'Capgemini': 'capgemini.com', 'Cisco': 'cisco.com',
  'Coforge': 'coforge.com', 'Cognizant': 'cognizant.com', 'Cyient': 'cyient.com',
  'Databricks': 'databricks.com', 'EPAM Systems': 'epam.com', 'Genpact': 'genpact.com',
  'Google': 'google.com', 'HCLTech': 'hcltech.com', 'Hexaware': 'hexaware.com',
  'IBM': 'ibm.com', 'IBM Consulting': 'ibm.com', 'Infosys': 'infosys.com',
  'Intel': 'intel.com', 'JPMorgan Chase': 'jpmorganchase.com',
  'L&T Technology Services': 'ltts.com', 'LTIMindtree': 'ltimindtree.com',
  'Mphasis': 'mphasis.com', 'NVIDIA': 'nvidia.com', 'Oracle': 'oracle.com',
  'Palantir': 'palantir.com', 'Persistent Systems': 'persistent.com',
  'Qualcomm': 'qualcomm.com', 'SAP': 'sap.com', 'ServiceNow': 'servicenow.com',
  'Stripe': 'stripe.com', 'TCS': 'tcs.com', 'Tech Mahindra': 'techmahindra.com',
  'Uber': 'uber.com', 'Wipro': 'wipro.com', 'Zensar Technologies': 'zensar.com',
  'Soft Computing Research Society (Unstop)': 'unstop.com',
  'Economic Times (Unstop)': 'unstop.com',
  'Google (Devpost)': 'google.com',
  'DataHub / Nebius AI / Entrepreneurs First (Devpost)': 'devpost.com',
  'DevNetwork (Devpost)': 'developerweek.com',
  'DeveloperWeek (Devpost, sponsors Amazon/Retool/Akamai)': 'developerweek.com',
  'Reverie Hacks (Devpost)': 'devpost.com',
};

/** Where a simple-icons slug differs from anything guessable from the sheet name. */
const ALIASES: Record<string, string> = {
  'jpmorgan chase': 'jpmorganchase', 'tech mahindra': 'techmahindra',
  'persistent systems': 'persistent', 'epam systems': 'epam',
  'zensar technologies': 'zensar', 'l&t technology services': 'lt',
};

function findVector(company: string): Icon | null {
  const alias = ALIASES[company.toLowerCase()];
  if (alias && BY_SLUG.has(alias)) return BY_SLUG.get(alias)!;

  // Sheet names carry noise: "(Devpost)", "/ Nebius AI", trailing descriptors.
  const base = company.replace(/\(.*?\)/g, '').trim();
  for (const variant of [base, base.split(/[/,]/)[0].trim()]) {
    for (const key of [variant.toLowerCase(), variant.toLowerCase().replace(/[^a-z0-9]/g, '')]) {
      const hit = BY_SLUG.get(key) ?? BY_TITLE.get(key);
      if (hit) return hit;
    }
  }
  return null;
}

async function main() {
  const res = await fetch(SHEET_CSV_URL);
  if (!res.ok) throw new Error(`sheet responded ${res.status}`);

  const companies = [...new Set(__internal.toOpportunities(await res.text()).map((o) => o.company))].sort();
  if (companies.length === 0) throw new Error('sheet parsed to zero companies');

  if (existsSync(OUT_DIR)) for (const f of readdirSync(OUT_DIR)) rmSync(`${OUT_DIR}/${f}`);
  mkdirSync(OUT_DIR, { recursive: true });

  const map: Record<string, string> = {};
  const monogram: string[] = [];
  let vectors = 0;
  let rasters = 0;

  for (const company of companies) {
    const icon = findVector(company);
    if (icon) {
      // Tiles are white, so the true brand hex is the readable one.
      writeFileSync(
        `${OUT_DIR}/${icon.slug}.svg`,
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${icon.hex}"><path d="${icon.path}"/></svg>\n`
      );
      map[company] = `${icon.slug}.svg`;
      vectors++;
      continue;
    }

    const domain = DOMAINS[company];
    if (!domain) { monogram.push(`${company} — no domain mapped`); continue; }

    try {
      const favicon = await fetch(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`, { redirect: 'follow' });
      if (!favicon.ok) throw new Error(`HTTP ${favicon.status}`);

      const buf = Buffer.from(await favicon.arrayBuffer());
      const width = (await sharp(buf).metadata()).width ?? 0;
      if (width < MIN_PX) throw new Error(`only ${width}px`);

      const slug = domain.replace(/\./g, '-');
      // Normalise every mark to one square so a mixed set reads as one system.
      await sharp(buf)
        .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toFile(`${OUT_DIR}/${slug}.png`);

      map[company] = `${slug}.png`;
      rasters++;
    } catch (e) {
      monogram.push(`${company} — ${(e as Error).message}`);
    }
  }

  writeFileSync(MAP_FILE, JSON.stringify(map, null, 2) + '\n');

  console.log(`${Object.keys(map).length}/${companies.length} companies (${vectors} vector, ${rasters} favicon)`);
  console.log(`${readdirSync(OUT_DIR).length} files in ${OUT_DIR}`);
  if (monogram.length) {
    console.log('\nfalling back to a monogram tile:');
    monogram.forEach((m) => console.log('  -', m));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
