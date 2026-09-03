import {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/react-native';

import { SupabaseClient, createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

/// Postgres Response codes that we cannot recover from by retrying.
const FATAL_RESPONSE_CODES = [
  // Class 22 — Data Exception
  // Examples include data type mismatch.
  new RegExp('^22...$'),
  // Class 23 — Integrity Constraint Violation.
  // Examples include NOT NULL, FOREIGN KEY and UNIQUE violations.
  new RegExp('^23...$'),
  // INSUFFICIENT PRIVILEGE - typically a row-level security violation
  new RegExp('^42501$'),
];

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;
const powersyncUrl = process.env.EXPO_PUBLIC_POWERSYNC_URL as string;

const assertConfiguration = () => {
  const missing = [
    ["EXPO_PUBLIC_SUPABASE_URL", supabaseUrl],
    ["EXPO_PUBLIC_SUPABASE_ANON_KEY", supabaseAnonKey],
    ["EXPO_PUBLIC_POWERSYNC_URL", powersyncUrl],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(
      `Missing app configuration: ${missing.map(([name]) => name).join(", ")}`
    );
  }
};

export class SupabaseConnector implements PowerSyncBackendConnector {
  client: SupabaseClient;

  constructor() {
    assertConfiguration();
    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  async login(username: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (error) {
      throw error;
    }
  }

  async fetchCredentials() {
    const {
      data: { session },
      error,
    } = await this.client.auth.getSession();

    if (!session || error) {
      throw new Error(`Could not fetch Supabase credentials: ${error}`);
    }

    return {
      client: this.client,
      endpoint: powersyncUrl,
      token: session.access_token ?? '',
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
      userID: session.user.id,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    let lastOp: CrudEntry | null = null;
    try {
      // Note: If transactional consistency is important, use database functions
      // or edge functions to process the entire transaction in a single call.
      for (const op of transaction.crud) {
        lastOp = op;
        const table = this.client.from(op.table);
        let result: any = null;
        switch (op.op) {
          case UpdateType.PUT:
            // eslint-disable-next-line no-case-declarations
            const record = { ...op.opData, id: op.id };
            result = await table.upsert(record);
            break;
          case UpdateType.PATCH:
            result = await table.update(op.opData ?? {}).eq('id', op.id);
            break;
          case UpdateType.DELETE:
            result = await table.delete().eq('id', op.id);
            break;
        }

        if (result.error) {
          throw result.error;
        }
      }

      await transaction.complete();
    } catch (ex: any) {
      if (typeof ex.code == 'string' && FATAL_RESPONSE_CODES.some((regex) => regex.test(ex.code))) {
        console.error("A queued local change was rejected by the backend", {
          operation: lastOp?.op,
          table: lastOp?.table,
          code: ex.code,
        });
      }

      // Keep the transaction queued. This avoids silent data loss and allows a
      // schema/RLS fix or a temporary network recovery to retry the same write.
      throw ex;
    }
  }
}
