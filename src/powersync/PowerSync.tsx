// // import '@azure/core-asynciterator-polyfill';
// // import 'react-native-polyfill-globals/auto';
// import { createContext, useContext } from 'react';
// import {
//   AbstractPowerSyncDatabase,
//   PowerSyncDatabase
// } from '@powersync/react-native';
// import { AppSchema, Database } from './AppSchema';
// import { Kysely, wrapPowerSyncWithKysely } from '@powersync/kysely-driver';
// import { SupabaseConnector } from './SupabaseConnector';

// export class System {
//   supabaseConnector: SupabaseConnector;
//   powersync: AbstractPowerSyncDatabase;
//   db: Kysely<Database>;

//   constructor() {
//     const factory = new PowerSyncDatabase({
//       database: {
//         dbFilename: 'test.sqlite'
//       },
//       schema: AppSchema
//     });

//     this.supabaseConnector = new SupabaseConnector();
//     this.powersync = factory.getInstance();
//     this.db = wrapPowerSyncWithKysely(this.powersync);
//   }

//   async init() {
//     console.log('Initializing system');
//     await this.powersync.init();
//     await this.powersync.connect(this.supabaseConnector);
//   }
// }

// export const system = new System();
// export const SystemContext = createContext(system);
// export const useSystem = () => useContext(SystemContext);

import { createContext, useContext } from "react";
import {
    PowerSyncDatabase,
    type PowerSyncDatabaseOptions,
} from "@powersync/react-native";
import { AppSchema, type Database } from "./AppSchema";
import { Kysely, wrapPowerSyncWithKysely } from "@powersync/kysely-driver";
import { SupabaseConnector } from "./SupabaseConnector";

export class System {
    supabaseConnector: SupabaseConnector;
    powersync: PowerSyncDatabase;
    db: Kysely<Database>;

    constructor() {
        // 1. Setup the PowerSync database with schema and SQLite config
        this.powersync = new PowerSyncDatabase({
            database: {
                dbFilename: "test.sqlite", // or ':memory:' for dev/test
            },
            schema: AppSchema,
        });

        // 2. Setup Supabase connector
        this.supabaseConnector = new SupabaseConnector();

        // 3. Wrap PowerSync with Kysely ORM
        // @ts-ignore
        this.db = wrapPowerSyncWithKysely(this.powersync);
    }

    async init() {
        console.log("nitializing PowerSync");

        // Wait for database to initialize
        await this.powersync.init();

        // Optionally wait for it to be ready
        await this.powersync.waitForReady();

        // Connect to sync backend (Supabase connector)
        await this.powersync.connect(this.supabaseConnector);

        console.log("PowerSync initialized and connected");
    }
}

// Provide globally
export const system = new System();
export const SystemContext = createContext<System>(system);
export const useSystem = () => useContext(SystemContext);
