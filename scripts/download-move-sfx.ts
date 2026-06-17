import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { fileURLToPath } from 'url';

import { MOVE_BATTLE_OVERRIDES } from '../src/data/move-battle-overrides';
// we cant use import due to same chaining inside audio manager so we copy paste the function from there
// import { moveToSfxKey } from '../src/audio/audio-manager';
/** Normalizes a move name to match the SFX filename convention. */
function moveToSfxKey(moveName: string): string {
  return moveName.replaceAll(/ /g, '').toLowerCase();
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '../public/audio/movesSFX');

/**
 * List the exact file names (without .mp3) you want to download.
 * These must match the names on the album page (case-sensitive).
 * Everything not listed here will be skipped.
 */
const MOVES_TO_DOWNLOAD: string[] = Object.keys(MOVE_BATTLE_OVERRIDES).map(moveToSfxKey);

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const BASE_URL = 'https://downloads.khinsider.com';
const ALBUM_PATH = '/game-soundtracks/album/pokemon-sfx-gen-7-attack-moves-sumo-usum';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const location = res.headers.location!;
          fetchText(location.startsWith('http') ? location : BASE_URL + location)
            .then(resolve)
            .catch(reject);
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          fs.unlinkSync(dest);
          downloadFile(res.headers.location!, dest).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
        file.on('error', (err) => {
          fs.unlinkSync(dest);
          reject(err);
        });
      })
      .on('error', (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
  });
}

/** Parse all song hrefs from the album page HTML dynamically */
function parseSongLinks(html: string): string[] {
  const links: string[] = [];
  // Matches any href pointing to an mp3, capturing the full relative or absolute path
  const re = /href="([^"]+\.mp3)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const linkPath = match[1];
    if (!links.includes(linkPath)) {
      links.push(linkPath);
    }
  }
  return links;
}

/** From the individual song page, extract the real .mp3 download URL */
function parseDirectMp3(html: string): string | null {
  // The song page has an <audio> tag or a direct download link
  // Look for: <a href="https://...mp3" ...>Click here to download</a>
  // or the audio src
  const patterns = [/href="(https:\/\/[^"]+\.mp3)"/i, /src="(https:\/\/[^"]+\.mp3)"/i];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m) return m[1];
  }
  return null;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const wantSet = new Set(MOVES_TO_DOWNLOAD);

  console.log(`Fetching album page…`);
  const albumHtml = await fetchText(BASE_URL + ALBUM_PATH);
  const allLinks = parseSongLinks(albumHtml);
  console.log(`Found ${allLinks.length} tracks on the album page.`);
  // ─── ADD THIS DEBUGGING BLOCK ──────────────────────────────────────────────
  console.log('\n--- RUNNING FILTER DIAGNOSTICS ---');
  const sampleLinks = allLinks.filter((l) => l.toLowerCase().includes('vine') || l.toLowerCase().includes('whip'));
  console.log(`Total raw links containing 'vine' or 'whip': ${sampleLinks.length}`);

  sampleLinks.forEach((link) => {
    const rawBase = path.basename(link, '.mp3');
    const decodedBase = decodeURIComponent(rawBase);
    const generatedKey = moveToSfxKey(decodedBase);
    const isMatched = wantSet.has(generatedKey);

    console.log(`\nRaw Link: ${link}`);
    console.log(`  -> Extracted Basename: "${rawBase}"`);
    console.log(`  -> Decoded Basename:  "${decodedBase}"`);
    console.log(`  -> Generated SFX Key: "${generatedKey}"`);
    console.log(`  -> Match Status:       ${isMatched ? '✅ MATCHED' : '❌ SKIPPED'}`);
  });
  console.log('-----------------------------------\n');
  // ─── END OF DEBUGGING BLOCK ────────────────────────────────────────────────

  // Filter to only the ones we want
  const toDownload = allLinks.filter((link) => {
    // Decode TWICE to resolve double-encoding (%2520 -> %20 -> real space)
    const onceDecoded = decodeURIComponent(path.basename(link, '.mp3'));
    const fullyDecoded = decodeURIComponent(onceDecoded);

    const fileName = moveToSfxKey(fullyDecoded);
    return wantSet.has(fileName);
  });

  console.log(`Matched ${toDownload.length} tracks to download (out of ${MOVES_TO_DOWNLOAD.length} requested).\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const songPath of toDownload) {
    const onceDecodedName = decodeURIComponent(path.basename(songPath, '.mp3'));
    const fullyDecodedName = decodeURIComponent(onceDecodedName);

    // This ensures your file saves locally as "airslash.mp3"
    const fileName = moveToSfxKey(fullyDecodedName) + '.mp3';
    const destPath = path.join(OUTPUT_DIR, fileName);
    if (fs.existsSync(destPath)) {
      console.log(`  [SKIP] ${fileName} — already exists`);
      skipped++;
      continue;
    }

    try {
      // Step 1: fetch the individual song page to get the real download URL
      const songPageUrl = songPath.startsWith('http')
        ? songPath
        : songPath.startsWith('/')
          ? BASE_URL + songPath
          : `${BASE_URL}/${songPath}`;
      const songHtml = await fetchText(songPageUrl);
      const mp3Url = parseDirectMp3(songHtml);

      if (!mp3Url) {
        console.error(`  [FAIL] ${fileName} — could not find direct MP3 URL`);
        failed++;
        continue;
      }

      // Step 2: download the file
      process.stdout.write(`  [DOWN] ${fileName} … `);
      await downloadFile(mp3Url, destPath);
      console.log(`done`);
      downloaded++;

      // Be polite to the server
      await sleep(300);
    } catch (err) {
      console.error(`  [FAIL] ${fileName} — ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone. Downloaded: ${downloaded}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
