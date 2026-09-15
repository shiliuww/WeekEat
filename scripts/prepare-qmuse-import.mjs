import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputDirectory = resolve(projectRoot, '.qmuse-stage');
const qmuseConfigPath = resolve(projectRoot, 'qmuse.config.json');
const requiredFiles = [
  'index.html',
  'package.json',
  'postcss.config.js',
  'tailwind.config.js',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(resolve(outputDirectory, 'public'), { recursive: true });

await Promise.all([
  cp(resolve(projectRoot, 'src'), resolve(outputDirectory, 'src'), { recursive: true }),
  cp(resolve(projectRoot, 'public/favicon.png'), resolve(outputDirectory, 'public/favicon.png')),
  ...requiredFiles.map((file) => cp(resolve(projectRoot, file), resolve(outputDirectory, file))),
]);

const qmuseConfig = JSON.parse(await readFile(qmuseConfigPath, 'utf8'));
if (typeof qmuseConfig.version !== 'string' || !qmuseConfig.version.trim()) {
  throw new Error('qmuse.config.json 必须包含非空的 version 字段。');
}

const stagedUpdateCheckerPath = resolve(outputDirectory, 'src/utils/updateChecker.ts');
const stagedUpdateChecker = await readFile(stagedUpdateCheckerPath, 'utf8');
const githubVersionDeclaration = 'export const CURRENT_APP_VERSION = __APP_VERSION__;\nexport const UPDATE_CHECK_ENABLED = true;';
const qmuseVersionDeclaration = `export const CURRENT_APP_VERSION = '${qmuseConfig.version.trim()}';\nexport const UPDATE_CHECK_ENABLED = false;`;

if (!stagedUpdateChecker.includes(githubVersionDeclaration)) {
  throw new Error('未找到 GitHub 版本声明，已停止生成 QMuse 发布副本。');
}

await Promise.all([
  writeFile(
    stagedUpdateCheckerPath,
    stagedUpdateChecker.replace(githubVersionDeclaration, qmuseVersionDeclaration)
  ),
  writeFile(resolve(outputDirectory, 'src/vite-env.d.ts'), '/// <reference types="vite/client" />\n'),
]);

console.log(`QMuse 发布副本已生成：${outputDirectory}`);
console.log(`QMuse 版本：v${qmuseConfig.version.trim()}（已关闭 GitHub 更新检查）`);
console.log('下一步：npx --yes @qmuse/qmuse-cli import .qmuse-stage');
