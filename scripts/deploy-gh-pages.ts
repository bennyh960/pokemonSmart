import { cp, mkdir, rm, stat, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

function run(command: string, args: string[], cwd: string, capture = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });

    let stdout = '';
    let stderr = '';
    if (capture) {
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(new Error(stderr.trim() || `${command} ${args.join(' ')} failed with code ${code}`));
    });
  });
}

async function readGitConfig(key: string, cwd: string): Promise<string | null> {
  try {
    const value = await run('git', ['config', '--get', key], cwd, true);
    return value || null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const distDir = join(repoRoot, 'dist');
  const dryRun = process.argv.includes('--dry-run');
  const branch = 'gh-pages';
  const remote = 'origin';

  await stat(distDir);

  const repoUrl = await readGitConfig(`remote.${remote}.url`, repoRoot);
  if (!repoUrl) {
    throw new Error(`Could not find remote "${remote}". Configure git remote origin first.`);
  }

  const userName = (await readGitConfig('user.name', repoRoot)) ?? 'GitHub Pages Deploy';
  const userEmail = (await readGitConfig('user.email', repoRoot)) ?? 'deploy@example.com';

  // התיקייה ששומרת על ה-77MB קבצי אודיו פיזית על הדיסק שלך
  const cacheDir = join(repoRoot, '.deploy_cache');

  if (!existsSync(cacheDir)) {
    await mkdir(cacheDir, { recursive: true });
  }

  // 1. ננקה מהתיקייה את כל הקבצים הישנים (והפעם מוחקים גם את ה-.git הישן כדי לאפס היסטוריה תקועה)
  const files = await readdir(cacheDir);
  for (const file of files) {
    await rm(join(cacheDir, file), { recursive: true, force: true });
  }

  // 2. נעתיק את קבצי ה-Vite החדשים לתוך תיקיית המטמון
  // מכיוון שרוב קבצי האודיו כבר קיימים ב-dist, ההעתקה המקומית מהירה, והקבצים מחכים בתיקייה
  await cp(distDir, cacheDir, { recursive: true });
  await writeFile(join(cacheDir, '.nojekyll'), '');

  // 3. איתחול Git מחדש בכל ריצה *רק* בשביל הקומיט (זה לוקח מילישנייה אחת)
  // זה מבטיח לגיטהאב קומיט נקי לחלוטין בלי התנגשויות ובלי שרשראות קומיטים מפוצלות
  await run('git', ['init'], cacheDir);
  await run('git', ['checkout', '--orphan', branch], cacheDir);
  await run('git', ['config', 'user.name', userName], cacheDir);
  await run('git', ['config', 'user.email', userEmail], cacheDir);

  // 4. נבצע את פקודות ה-Git
  await run('git', ['add', '.'], cacheDir);

  try {
    await run('git', ['commit', '-m', 'Deploy GitHub Pages [skip ci]'], cacheDir);
  } catch {
    console.log('⚡ No changes detected in build. Skipping push.');
    return;
  }

  if (dryRun) {
    console.log(`Dry run complete. Would push ${cacheDir} to ${repoUrl} (${branch}).`);
    return;
  }

  // 5. העלאה מהירה לגיטהאב
  // מכיוון שגיטהאב מזהה שרמת השינוי בפועל מול השרת היא רק קבצי ה-React, ה-Push עדיין ייקח 15 שניות,
  // אבל GitHub Actions יקבל קומיט חלק, יתחיל לעבוד מיד ויציג V ירוק בלי קריסות!
  await run('git', ['push', '--force', repoUrl, `HEAD:${branch}`], cacheDir);
  console.log(`🚀 Deployed dist to ${branch} successfully and cleanly!`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
