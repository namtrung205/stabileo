import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  });
}

describe('React-only frontend architecture', () => {
  it('contains no Svelte source files or Svelte build dependency', () => {
    const svelteFiles = sourceFiles(join(root, 'src')).filter((path) =>
      path.endsWith('.svelte') || path.endsWith('.svelte.ts'),
    );
    expect(svelteFiles).toEqual([]);

    const packageJson = JSON.parse(read('package.json')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };
    const packages = { ...packageJson.dependencies, ...packageJson.devDependencies };
    expect(packages).not.toHaveProperty('svelte');
    expect(packages).not.toHaveProperty('@sveltejs/vite-plugin-svelte');
    expect(packages).not.toHaveProperty('svelte-check');
    expect(Object.values(packageJson.scripts ?? {}).join('\n')).not.toMatch(/svelte/i);
    expect(read('vite.config.ts')).not.toContain('vite-plugin-svelte');
    expect(read('tsconfig.json')).not.toMatch(/["']svelte["']/);
  });

  it('has one React editor shell and no PRO or Education UI tree', () => {
    const app = read('src/react/App.tsx');
    expect(app).toContain('<BasicEditorApp />');
    expect(app).not.toMatch(/ProEducationEditorApp|LegacySvelteApp/);
    const proRoot = join(root, 'src/components/pro');
    const educationRoot = join(root, 'src/components/edu');
    expect(existsSync(proRoot) ? sourceFiles(proRoot) : []).toEqual([]);
    expect(existsSync(educationRoot) ? sourceFiles(educationRoot) : []).toEqual([]);
    expect(existsSync(join(root, 'src/react/editor/ProEducationEditorApp.tsx'))).toBe(false);

    const editorSources = sourceFiles(join(root, 'src/react'))
      .filter((path) => !path.includes('__tests__'))
      .filter((path) => ['.ts', '.tsx'].includes(extname(path)))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');
    expect(editorSources).not.toContain("from '../../components/pro");
    expect(editorSources).not.toContain("from '../../components/edu");
  });
});
