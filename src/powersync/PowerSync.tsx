import { createContext, useContext } from "react";
import {
    PowerSyncDatabase,
} from "@powersync/react-native";
import { AppSchema, type Database } from "./AppSchema";
import { Kysely, wrapPowerSyncWithKysely } from "@powersync/kysely-driver";
import { SupabaseConnector } from "./SupabaseConnector";

export class System {
    supabaseConnector: SupabaseConnector;
    powersync: PowerSyncDatabase;
    db: Kysely<Database>;
    private initialization: Promise<void> | null = null;
    private connection: Promise<void> | null = null;

    constructor() {
        // 1. Setup the PowerSync database with schema and SQLite config
        this.powersync = new PowerSyncDatabase({
            database: {
                dbFilename: "autocare.sqlite",
            },
            schema: AppSchema,
        });

        // 2. Setup Supabase connector
        this.supabaseConnector = new SupabaseConnector();

        this.db = wrapPowerSyncWithKysely<Database>(this.powersync);
    }

    async initDatabase() {
        if (!this.initialization) {
            this.initialization = (async () => {
                await this.powersync.init();
                await this.powersync.waitForReady();
            })();
        }

        return this.initialization;
    }

    async connect() {
        await this.initDatabase();

        if (this.powersync.connected || this.powersync.connecting) {
            return;
        }

        if (!this.connection) {
            this.connection = this.powersync
                .connect(this.supabaseConnector)
                .finally(() => {
                    this.connection = null;
                });
        }

        return this.connection;
    }

    async init() {
        await this.initDatabase();
        await this.connect();
    }
}

// Provide globally
export const system = new System();
export const SystemContext = createContext<System>(system);
export const useSystem = () => useContext(SystemContext);
