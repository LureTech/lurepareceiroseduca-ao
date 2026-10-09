import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Cria o schema deste site (DB_SCHEMA, ex.: "lure2") no mesmo banco Supabase do LURE EDUCAÇÃO original,
 * com as mesmas tabelas do schema "lure", mas vazio: sem trilhas, módulos, aulas, alunos nem comunidade.
 * Copia só as contas de administrador do original (mesmo e-mail e senha, ids novos), para dar para entrar.
 * Nunca escreve no schema "lure"; só lê os administradores de lá.
 * Uso: npx tsx scripts/criar-schema.ts   (lê supabase.env como o iniciar.cmd)
 */
if (existsSync('supabase.env')) {
  for (const line of readFileSync('supabase.env', 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    process.env[t.substring(0, i).trim()] ??= t.substring(i + 1).trim();
  }
}

const ORIGINAL = 'lure';
const schema = process.env.DB_SCHEMA ?? '';
if (!/^[a-z_][a-z0-9_]*$/.test(schema) || schema === ORIGINAL) {
  throw new Error(`Defina DB_SCHEMA no supabase.env com um nome diferente de "${ORIGINAL}" (ex.: lure2).`);
}

const { db } = await import('../server/lib/db.js');
const sql = db();

const [{ exists }] = await sql<{ exists: boolean }[]>`
  SELECT to_regclass(${schema + '.users'}) IS NOT NULL AS exists`;
if (exists) {
  console.log(`O schema "${schema}" já existe; nada foi alterado.`);
  await sql.end();
  process.exit(0);
}

// Migrações do backend Java (estrutura base) e depois as da API em TypeScript, todas sem nome de schema.
const migrations = [
  ...readdirSync('backend/src/main/resources/db/migration')
    .filter((f) => /^V\d+__.*\.sql$/.test(f))
    .sort((a, b) => Number(a.slice(1, a.indexOf('__'))) - Number(b.slice(1, b.indexOf('__'))))
    .map((f) => join('backend/src/main/resources/db/migration', f)),
  ...readdirSync('server/sql').filter((f) => f.endsWith('.sql')).sort().map((f) => join('server/sql', f)),
];

const admins = await sql.begin(async (tx) => {
  await tx.unsafe(`CREATE SCHEMA ${schema}`);
  await tx.unsafe(`SET LOCAL search_path TO ${schema}`);
  for (const file of migrations) {
    await tx.unsafe(readFileSync(file, 'utf8'));
    console.log(`Migração ${file} aplicada.`);
  }
  return tx.unsafe(`
    INSERT INTO ${schema}.users (id, email, password_hash, full_name, avatar_path, role, active, created_at, updated_at)
    SELECT gen_random_uuid(), email, password_hash, full_name, NULL, role, active, now(), now()
    FROM ${ORIGINAL}.users WHERE role = 'ADMIN'
    RETURNING email`);
});

console.log(`Schema "${schema}" criado. Administradores copiados: ${admins.map((a) => a.email).join(', ') || 'nenhum'}.`);
await sql.end();
