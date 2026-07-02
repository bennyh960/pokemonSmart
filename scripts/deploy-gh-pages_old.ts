import { cp, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

function run(command: string, args: string[], cwd: string, capture = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });

    let stdout = '';
    let stderr = '';
    if (capture) {
      child.stdout?.on('data', (chunk) => { stdout += chunk.toString(); });
      child.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });
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

  const userName = await readGitConfig('user.name', repoRoot) ?? 'GitHub Pages Deploy';
  const userEmail = await readGitConfig('user.email', repoRoot) ?? 'deploy@example.com';
  const tempDir = await mkdtemp(join(tmpdir(), 'pokemon-gh-pages-'));

  try {
    await cp(distDir, tempDir, { recursive: true });
    await writeFile(join(tempDir, '.nojekyll'), '');

    await run('git', ['init'], tempDir);
    await run('git', ['checkout', '--orphan', branch], tempDir);
    await run('git', ['config', 'user.name', userName], tempDir);
    await run('git', ['config', 'user.email', userEmail], tempDir);
    await run('git', ['add', '.'], tempDir);
    await run('git', ['commit', '-m', 'Deploy GitHub Pages'], tempDir);

    if (dryRun) {
      console.log(`Dry run complete. Would push ${tempDir} to ${repoUrl} (${branch}).`);
      return;
    }

    await run('git', ['push', '--force', repoUrl, `HEAD:${branch}`], tempDir);
    console.log(`Deployed dist to ${branch}.`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
