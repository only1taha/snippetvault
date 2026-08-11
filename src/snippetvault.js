#!/usr/bin/env node
'use strict';
/**
 * snippetvault — Personal code snippet manager
 */

const { program } = require('commander');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const PKG = require('../package.json');

const R='\x1b[0m', G='\x1b[32m', Y='\x1b[33m', B='\x1b[34m', BOLD='\x1b[1m', DIM='\x1b[2m', C='\x1b[36m';

// ─── Storage ──────────────────────────────────────────────────────────────────

const VAULT_DIR  = path.join(os.homedir(), '.snippetvault');
const VAULT_FILE = path.join(VAULT_DIR, 'vault.json');

function loadVault() {
  if (!fs.existsSync(VAULT_DIR)) fs.mkdirSync(VAULT_DIR, { recursive: true });
  if (!fs.existsSync(VAULT_FILE)) return { snippets: [], nextId: 1 };
  return JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8'));
}

function saveVault(vault) {
  fs.writeFileSync(VAULT_FILE, JSON.stringify(vault, null, 2), 'utf8');
}

// ─── Display ──────────────────────────────────────────────────────────────────

const LANG_COLORS = { js:'33', ts:'34', py:'32', sh:'32', go:'36', rs:'31', css:'35', md:'37' };

function langColor(lang) {
  const code = LANG_COLORS[lang?.toLowerCase()] || '37';
  return `\x1b[${code}m`;
}

function printSnippet(s, showCode = false) {
  const lc = langColor(s.language);
  const tags = s.tags.length ? `  ${DIM}[${s.tags.join(', ')}]${R}` : '';
  console.log(`\n  ${BOLD}#${s.id}${R} ${BOLD}${s.title}${R}${tags}`);
  console.log(`     ${lc}${s.language || 'text'}${R}  ${DIM}${s.createdAt?.split('T')[0] || ''}${R}`);
  if (showCode) {
    console.log(`\n${C}${s.code}${R}`);
  }
}

// ─── Commands ────────────────────────────────────────────────────────────────

program.name('snippetvault').description('Personal code snippet manager').version(PKG.version);

program
  .command('add')
  .description('Add a new snippet')
  .option('-t, --title <title>', 'Snippet title')
  .option('-l, --lang <lang>', 'Language (js, py, sh, etc.)', 'text')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('-f, --file <file>', 'Read code from a file')
  .option('-c, --code <code>', 'Inline code string')
  .action((opts) => {
    const vault = loadVault();
    let title = opts.title;
    let code = opts.code || '';

    if (!title) {
      // Simple prompt fallback
      const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
      readline.question('Title: ', (t) => {
        title = t.trim();
        readline.close();
        addSnippet(vault, title, opts, code);
      });
      return;
    }

    if (opts.file) {
      if (!fs.existsSync(opts.file)) { console.error(`File not found: ${opts.file}`); process.exit(1); }
      code = fs.readFileSync(opts.file, 'utf8');
    }

    if (!code) {
      console.log(`${Y}No code provided. Use --code "..." or --file <path>${R}`);
      console.log(`${DIM}Example: node src/snippetvault.js add --title "Hello World" --lang js --code "console.log('Hello!')"${R}`);
      return;
    }
    addSnippet(vault, title, opts, code);
  });

function addSnippet(vault, title, opts, code) {
  const snippet = {
    id: vault.nextId++,
    title,
    language: opts.lang || 'text',
    tags: opts.tags ? opts.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    code,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  vault.snippets.push(snippet);
  saveVault(vault);
  console.log(`${G}✓ Snippet #${snippet.id} saved: "${title}"${R}`);
}

program
  .command('list')
  .description('List all snippets')
  .option('--tag <tag>', 'Filter by tag')
  .option('--lang <lang>', 'Filter by language')
  .action((opts) => {
    const vault = loadVault();
    let snippets = vault.snippets;
    if (opts.tag)  snippets = snippets.filter(s => s.tags.includes(opts.tag));
    if (opts.lang) snippets = snippets.filter(s => s.language === opts.lang);

    if (!snippets.length) { console.log(`${Y}No snippets found.${R}`); return; }
    console.log(`\n${BOLD}Vault — ${snippets.length} snippet${snippets.length !== 1 ? 's' : ''}${R}`);
    console.log('─'.repeat(50));
    snippets.forEach(s => printSnippet(s, false));
    console.log('');
  });

program
  .command('show <id>')
  .description('Show a snippet with its code')
  .action((id) => {
    const vault = loadVault();
    const s = vault.snippets.find(x => x.id === parseInt(id));
    if (!s) { console.log(`${Y}Snippet #${id} not found.${R}`); return; }
    printSnippet(s, true);
    console.log('');
  });

program
  .command('search <query>')
  .description('Fuzzy search snippets by title, code, or tags')
  .option('-n, --limit <n>', 'Max results', '10')
  .action((query, opts) => {
    const vault = loadVault();
    if (!vault.snippets.length) { console.log(`${Y}Vault is empty.${R}`); return; }

    let Fuse;
    try { Fuse = require('fuse.js'); } catch {
      // Fallback: simple text search
      const q = query.toLowerCase();
      const results = vault.snippets.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      );
      if (!results.length) { console.log(`${Y}No results for "${query}".${R}`); return; }
      console.log(`\n${BOLD}Results for "${query}":${R}`);
      results.slice(0, parseInt(opts.limit)).forEach(s => printSnippet(s, false));
      return;
    }

    const fuse = new Fuse(vault.snippets, {
      keys: [
        { name: 'title', weight: 3 },
        { name: 'tags', weight: 2 },
        { name: 'language', weight: 1 },
        { name: 'code', weight: 0.5 },
      ],
      threshold: 0.4,
      includeScore: true,
    });

    const results = fuse.search(query).slice(0, parseInt(opts.limit));
    if (!results.length) { console.log(`${Y}No results for "${query}".${R}`); return; }
    console.log(`\n${BOLD}Results for "${query}" (${results.length} found):${R}`);
    results.forEach(r => printSnippet(r.item, false));
    console.log('');
  });

program
  .command('delete <id>')
  .description('Delete a snippet by ID')
  .action((id) => {
    const vault = loadVault();
    const idx = vault.snippets.findIndex(x => x.id === parseInt(id));
    if (idx === -1) { console.log(`${Y}Snippet #${id} not found.${R}`); return; }
    const [removed] = vault.snippets.splice(idx, 1);
    saveVault(vault);
    console.log(`${G}✓ Deleted snippet #${id}: "${removed.title}"${R}`);
  });

program
  .command('export')
  .description('Export vault to a JSON file')
  .option('-o, --output <file>', 'Output file', 'snippetvault-export.json')
  .action((opts) => {
    const vault = loadVault();
    fs.writeFileSync(opts.output, JSON.stringify(vault, null, 2));
    console.log(`${G}✓ Exported ${vault.snippets.length} snippets to ${opts.output}${R}`);
  });

program
  .command('import <file>')
  .description('Import snippets from a JSON export')
  .option('--merge', 'Merge with existing vault (default: replace)')
  .action((file, opts) => {
    if (!fs.existsSync(file)) { console.error(`File not found: ${file}`); process.exit(1); }
    const imported = JSON.parse(fs.readFileSync(file, 'utf8'));
    const vault = opts.merge ? loadVault() : { snippets: [], nextId: 1 };

    let count = 0;
    for (const s of imported.snippets || []) {
      s.id = vault.nextId++;
      vault.snippets.push(s);
      count++;
    }
    saveVault(vault);
    console.log(`${G}✓ Imported ${count} snippets${opts.merge ? ' (merged)' : ''}${R}`);
  });

program
  .command('stats')
  .description('Show vault statistics')
  .action(() => {
    const vault = loadVault();
    const { snippets } = vault;
    if (!snippets.length) { console.log(`${Y}Vault is empty.${R}`); return; }

    const langs = {};
    const tags = {};
    snippets.forEach(s => {
      langs[s.language] = (langs[s.language] || 0) + 1;
      s.tags.forEach(t => { tags[t] = (tags[t] || 0) + 1; });
    });

    console.log(`\n${BOLD}SnippetVault Stats${R}`);
    console.log('─'.repeat(40));
    console.log(`  Total snippets: ${G}${snippets.length}${R}`);
    console.log(`  Vault location: ${DIM}${VAULT_FILE}${R}`);

    console.log(`\n${BOLD}Top Languages:${R}`);
    Object.entries(langs).sort((a,b)=>b[1]-a[1]).slice(0,5).forEach(([l,n]) => {
      const lc = langColor(l);
      console.log(`  ${lc}${l.padEnd(12)}${R} ${G}${n}${R} snippet${n!==1?'s':''}`);
    });

    if (Object.keys(tags).length) {
      console.log(`\n${BOLD}Top Tags:${R}`);
      Object.entries(tags).sort((a,b)=>b[1]-a[1]).slice(0,8).forEach(([t,n]) => {
        console.log(`  #${t.padEnd(16)} ${G}${n}${R}`);
      });
    }
    console.log('');
  });

program
  .command('demo')
  .description('Add sample snippets to demonstrate the vault')
  .action(() => {
    const vault = loadVault();
    const samples = [
      { title: 'Reverse a string', language: 'js', tags: ['js','strings','utils'], code: "const reverse = str => str.split('').reverse().join('');\nconsole.log(reverse('hello')); // 'olleh'" },
      { title: 'Flatten nested array', language: 'js', tags: ['js','arrays'], code: "const flatten = arr => arr.flat(Infinity);\nconsole.log(flatten([1,[2,[3,[4]]]])); // [1,2,3,4]" },
      { title: 'Read file in Python', language: 'py', tags: ['python','files'], code: "with open('file.txt', 'r') as f:\n    content = f.read()\nprint(content)" },
    ];
    for (const s of samples) {
      s.id = vault.nextId++;
      s.createdAt = new Date().toISOString();
      s.updatedAt = s.createdAt;
      vault.snippets.push(s);
    }
    saveVault(vault);
    console.log(`${G}✓ Added ${samples.length} demo snippets${R}`);
    console.log(`Run: node src/snippetvault.js list`);
  });

program.parse(process.argv);
if (!process.argv.slice(2).length) program.outputHelp();
