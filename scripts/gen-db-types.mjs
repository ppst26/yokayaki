#!/usr/bin/env node
/**
 * Generate lib/database.types.ts from live Postgres schema.
 *
 * Preferred: `pnpm db:types` (Supabase CLI + SUPABASE_PROJECT_ID + login)
 * Fallback: this script uses SUPABASE_DB_URL when CLI needs Docker.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outFile = path.join(root, 'lib', 'database.types.ts');

function loadEnvLocal() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function pgTypeToTs(dataType, udtName) {
  switch (dataType) {
    case 'integer':
    case 'bigint':
    case 'smallint':
    case 'numeric':
    case 'real':
    case 'double precision':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'json':
    case 'jsonb':
      return 'Json';
    case 'ARRAY':
      if (udtName === '_int4' || udtName === '_int8' || udtName === '_int2') return 'number[]';
      if (udtName === '_text' || udtName === '_varchar') return 'string[]';
      return 'Json';
    case 'USER-DEFINED':
      return udtName;
    default:
      return 'string';
  }
}

function pgTypeNameToTs(typeName) {
  const t = typeName.trim().toLowerCase();
  if (t.includes('[]')) return 'Json';
  if (t === 'integer' || t === 'bigint' || t === 'smallint' || t === 'numeric' || t === 'real' || t === 'double precision') {
    return 'number';
  }
  if (t === 'boolean') return 'boolean';
  if (t === 'json' || t === 'jsonb') return 'Json';
  if (t === 'uuid' || t === 'text' || t.startsWith('character') || t === 'date' || t.includes('timestamp')) {
    return 'string';
  }
  return 'string';
}

function parseFnArgs(argsStr) {
  if (!argsStr) return [];
  return argsStr.split(',').map(part => {
    const tokens = part.trim().split(/\s+/);
    const name = tokens[0];
    const type = tokens.slice(1).join(' ');
    return { name, ts: pgTypeNameToTs(type) };
  });
}

function parseTableReturn(resultStr) {
  const match = resultStr.match(/^TABLE\((.*)\)$/i);
  if (!match) return null;
  return match[1].split(',').map(part => {
    const tokens = part.trim().split(/\s+/);
    const name = tokens[0];
    const type = tokens.slice(1).join(' ');
    return { name, ts: pgTypeNameToTs(type) };
  });
}

function parseFnReturn(resultStr) {
  const table = parseTableReturn(resultStr);
  if (table) {
    const props = table.map(f => `            ${f.name}: ${f.ts}`).join('\n');
    return `{\n${props}\n          }[]`;
  }
  const scalar = pgTypeNameToTs(resultStr);
  return scalar;
}

async function main() {
  loadEnvLocal();
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    console.error('[gen-db-types] ต้องตั้ง SUPABASE_DB_URL ใน .env.local');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows: enums } = await client.query(`
    SELECT t.typname AS name, e.enumlabel AS label
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder
  `);

  const enumMap = new Map();
  for (const row of enums) {
    if (!enumMap.has(row.name)) enumMap.set(row.name, []);
    enumMap.get(row.name).push(row.label);
  }

  const { rows: columns } = await client.query(`
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      c.udt_name,
      c.is_nullable,
      c.column_default
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY c.table_name, c.ordinal_position
  `);

  const { rows: functions } = await client.query(`
    SELECT
      p.proname AS name,
      pg_get_function_identity_arguments(p.oid) AS args,
      pg_get_function_result(p.oid) AS result
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname NOT LIKE '\\_%' ESCAPE '\\'
      AND pg_get_function_result(p.oid) NOT IN ('trigger', 'event_trigger')
    ORDER BY p.proname
  `);

  await client.end();

  const tables = new Map();
  for (const col of columns) {
    if (!tables.has(col.table_name)) tables.set(col.table_name, []);
    tables.get(col.table_name).push(col);
  }

  const enumBlocks = [...enumMap.entries()]
    .map(([name, labels]) => `      ${name}: ${labels.map(l => JSON.stringify(l)).join(' | ')}`)
    .join('\n');

  const tableBlocks = [...tables.entries()]
    .map(([tableName, cols]) => {
      const rowProps = cols.map(c => {
        const ts = pgTypeToTs(c.data_type, c.udt_name);
        const nullable = c.is_nullable === 'YES';
        return `          ${c.column_name}: ${ts}${nullable ? ' | null' : ''}`;
      });

      const insertProps = cols.map(c => {
        const ts = pgTypeToTs(c.data_type, c.udt_name);
        const nullable = c.is_nullable === 'YES';
        const hasDefault = c.column_default != null;
        const optional = nullable || hasDefault || c.column_name === 'id';
        return `          ${c.column_name}${optional ? '?' : ''}: ${ts}${nullable ? ' | null' : ''}`;
      });

      const updateProps = cols.map(c => {
        const ts = pgTypeToTs(c.data_type, c.udt_name);
        const nullable = c.is_nullable === 'YES';
        return `          ${c.column_name}?: ${ts}${nullable ? ' | null' : ''}`;
      });

      return `      ${tableName}: {
        Row: {
${rowProps.join('\n')}
        }
        Insert: {
${insertProps.join('\n')}
        }
        Update: {
${updateProps.join('\n')}
        }
        Relationships: []
      }`;
    })
    .join('\n');

  const functionBlocks = functions
    .map(fn => {
      const args = parseFnArgs(fn.args);
      const argProps =
        args.length === 0
          ? ''
          : args.map(a => `          ${a.name}: ${a.ts} | null`).join('\n');
      const argsBlock = args.length === 0 ? '{}' : `{\n${argProps}\n        }`;
      const returns = parseFnReturn(fn.result);
      return `      ${fn.name}: {
        Args: ${argsBlock}
        Returns: ${returns}
      }`;
    })
    .join('\n');

  const content = `// Generated by scripts/gen-db-types.mjs — do not edit by hand
// Re-run: pnpm db:types:local (or official \`pnpm db:types\` with Supabase CLI login)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
${tableBlocks}
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
${functionBlocks || '      [_ in never]: never'}
    }
    Enums: {
${enumBlocks || '      [_ in never]: never'}
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never
`;

  fs.writeFileSync(outFile, content, 'utf8');
  console.log(`[gen-db-types] wrote ${outFile} (${tables.size} tables, ${functions.length} functions)`);
}

main().catch(err => {
  console.error('[gen-db-types]', err);
  process.exit(1);
});
