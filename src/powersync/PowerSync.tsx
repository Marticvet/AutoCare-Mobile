// // // import '@azure/core-asynciterator-polyfill';
// // // import 'react-native-polyfill-globals/auto';
// // import { createContext, useContext } from "react";
// // import {
// //     AbstractPowerSyncDatabase,
// //     RNQSPowerSyncDatabaseOpenFactory,
// // } from "@powersync/react-native";
// // import { AppSchema, Database } from "./AppSchema";
// // import { SupabaseConnector } from "./SupabaseConnector";

// // import { wrapPowerSyncWithKysely } from "@powersync/kysely-driver";
// // import { Kysely } from "kysely";

// // export class System {
// //     supabaseConnector: SupabaseConnector;
// //     powersync: AbstractPowerSyncDatabase;
// //     db: Kysely<Database>;

// //     constructor() {
// //         const factory = new RNQSPowerSyncDatabaseOpenFactory({
// //             schema: AppSchema,
// //             dbFilename: "app.sqlite",
// //         });

// //         this.supabaseConnector = new SupabaseConnector();
// //         this.powersync = factory.getInstance();
// //         // @ts-ignore
// //         this.db = wrapPowerSyncWithKysely(this.powersync);
// //     }

// //     async init() {
// //         console.log("Initializing system");
// //         await this.powersync.init();
// //         await this.powersync.connect(this.supabaseConnector);

// //         const status = this.powersync.currentStatus;
// //         if (status.hasSynced) {
// //             console.log("Sync complete!");
// //         }
// //     }
// // }

// // export const system = new System();
// // export const SystemContext = createContext(system);
// // export const useSystem = () => useContext(SystemContext);

// import { createContext, useContext } from "react";
// import {
//     AbstractPowerSyncDatabase,
//     RNQSPowerSyncDatabaseOpenFactory,
// } from "@powersync/react-native";
// import { AppSchema, Database } from "./AppSchema";
// import { SupabaseConnector } from "./SupabaseConnector";
// import { wrapPowerSyncWithKysely } from "@powersync/kysely-driver";
// import { Kysely } from "kysely";

// export class System {
//     supabaseConnector: SupabaseConnector;
//     powersync: AbstractPowerSyncDatabase;
//     db: Kysely<Database>;

//     constructor() {
//         const factory = new RNQSPowerSyncDatabaseOpenFactory({
//             schema: AppSchema,
//             dbFilename: "app.sqlite",
//             debugMode: true,
//         });

//         this.supabaseConnector = new SupabaseConnector();
//         this.powersync = factory.getInstance();
//         // @ts-ignore
//         this.db = wrapPowerSyncWithKysely(this.powersync);
//     }

//     async init() {
//         await this.powersync.init();
//         await this.powersync.connect(this.supabaseConnector);


//         const status = this.powersync.currentStatus;
//         if (status.hasSynced) {
//             console.log("PowerSync initial sync completed.");
//         } else {
//             console.log("PowerSync has not completed initial sync yet.");
//         }
//     }
// }

// export const system = new System();
// export const SystemContext = createContext(system);
// export const useSystem = () => useContext(SystemContext);
import { createContext, useContext } from 'react';
import {
  AbstractPowerSyncDatabase,
  RNQSPowerSyncDatabaseOpenFactory,
} from '@powersync/react-native';
import { AppSchema, Database } from './AppSchema';
import { Kysely, wrapPowerSyncWithKysely } from '@powersync/kysely-driver';
import { SupabaseConnector } from './SupabaseConnector';

export class System {
  supabaseConnector: SupabaseConnector;
  powersync: AbstractPowerSyncDatabase;
  db: Kysely<Database>;

  constructor() {
    const factory = new RNQSPowerSyncDatabaseOpenFactory({
      schema: AppSchema,
      dbFilename: 'app.sqlite',
    });

    this.supabaseConnector = new SupabaseConnector();
    this.powersync = factory.getInstance();
    // @ts-ignore
    this.db = wrapPowerSyncWithKysely(this.powersync);
  }

  async init() {
    console.log('Initializing system');
    await this.powersync.init();
    await this.powersync.connect(this.supabaseConnector);
  }
}

export const system = new System();
export const SystemContext = createContext(system);
export const useSystem = () => useContext(SystemContext);
