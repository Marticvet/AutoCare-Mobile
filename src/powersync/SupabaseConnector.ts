import {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/react-native';

import { SupabaseClient, createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;
const powersyncUrl = process.env.EXPO_PUBLIC_POWERSYNC_URL as string;

type SupabaseUploadError = Error & {
  code?: string;
  details?: string | null;
  hint?: string | null;
};

const numericValue = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

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

  async refreshSession() {
    const { data, error } = await this.client.auth.refreshSession();
    if (error) throw error;
    if (!data.session) throw new Error('The Supabase session could not be refreshed. Sign in again.');
    return data.session;
  }

  private async explainRlsFailure(error: SupabaseUploadError, op: CrudEntry | null) {
    if (error.code !== '42501' || !op) return error;

    const {
      data: { session },
    } = await this.client.auth.getSession();
    const rowOwnerId = typeof op.opData?.user_id === 'string' ? op.opData.user_id : null;
    const ownerMatchesSession = Boolean(session?.user.id && rowOwnerId === session.user.id);
    const parts = [
      `Supabase rejected ${op.table} ${op.op} under RLS`,
      session ? 'session active' : 'session missing',
    ];

    if (rowOwnerId) {
      parts.push(ownerMatchesSession ? 'row owner matches session' : 'row owner differs from session');
    } else {
      parts.push('queued operation has no user_id');
    }

    if (op.table === 'reminders' && rowOwnerId) {
      const { data: allowed, error: checkError } = await this.client.rpc(
        'reminders_can_write_row',
        {
          target_owner_id: rowOwnerId,
          repeat_months_value: numericValue(op.opData?.repeat_months),
          repeat_km_value: numericValue(op.opData?.repeat_km),
        }
      );

      if (checkError) {
        parts.push(`policy diagnostic unavailable (${checkError.code || 'RPC error'}); verify the RLS migration was deployed to this build's Supabase project`);
      } else {
        parts.push(`database policy check: ${allowed ? 'allowed' : 'denied'}`);
        if (allowed) {
          parts.push('the deployed INSERT policy or project does not match the migration');
        } else if (ownerMatchesSession) {
          parts.push('check the recurring-reminder entitlement for this account');
        } else {
          parts.push('check the active shared-garage membership and garage owner entitlement');
        }
      }
    }

    const explained = new Error(`${parts.join(' · ')}. ${error.message}`) as SupabaseUploadError;
    explained.code = error.code;
    explained.details = error.details;
    explained.hint = error.hint;
    return explained;
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
            const record = { ...op.opData, id: op.id };
            // A budget has one row per owner/vehicle. A device can legitimately
            // create a replacement row before the existing server row has been
            // downloaded, so resolve that natural-key conflict instead of
            // permanently blocking every later upload in the queue.
            result = op.table === 'vehicle_budgets'
              ? await table.upsert(record, { onConflict: 'user_id,vehicle_id' })
              : await table.upsert(record);
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
    } catch (ex: unknown) {
      // Keep the transaction queued. This avoids silent data loss and allows a
      // schema/RLS fix or a temporary network recovery to retry the same write.
      if (ex instanceof Error) {
        throw await this.explainRlsFailure(ex as SupabaseUploadError, lastOp);
      }
      throw ex;
    }
  }
}
