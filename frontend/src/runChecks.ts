import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function findCheckFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...findCheckFiles(fullPath));
    } else if (entry.endsWith('.check.ts')) {
      results.push(fullPath);
    }
  }

  return results;
}

function runCheck(file: string): void {
  const relative = file.replace(resolve(__dirname, '..'), '');
  console.log(`\n▶ Running: ${relative}`);
  execSync(`npx tsx "${file}"`, { stdio: 'inherit' });
}

function main() {
  const checkFiles = findCheckFiles(__dirname);
  console.log(`Found ${checkFiles.length} check files in frontend.`);

  let failed = 0;
  for (const file of checkFiles) {
    try {
      runCheck(file);
    } catch (err: unknown) {
      console.error(`❌ Check failed: ${file}`, err);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`\n❌ ${failed} check file(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\n✔ All ${checkFiles.length} frontend feature checks passed successfully!`);
  }
}

main();
