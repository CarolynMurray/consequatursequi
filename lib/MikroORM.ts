import 'reflect-metadata';
import { Db, MongoClient } from 'mongodb';
import { EntityManager } from './EntityManager';
import { EntityMetadata } from './BaseEntity';

export function getMetadataStorage(entity?: string): { [entity: string]: EntityMetadata } {
  if (!(global as any)['MIKRO-ORM-STORAGE']) {
    (global as any)['MIKRO-ORM-STORAGE'] = {} as any;
  }

  const storage = (global as any)['MIKRO-ORM-STORAGE'];

  if (entity && !storage[entity]) {
    storage[entity] = {} as EntityMetadata;
  }

  return storage;
}

export class MikroORM {

  public em: EntityManager;
  private client: MongoClient;
  private db: Db;

  static async init(options: Options): Promise<MikroORM> {
    const orm = new MikroORM(options);
    const db = await orm.connect();
    orm.em = new EntityManager(db, orm.options);

    return orm;
  }

  constructor(public options: Options) {
    if (!this.options.dbName) {
      throw new Error('No database specified, please fill in `dbName` option');
    }

    if (!this.options.entitiesDirs || this.options.entitiesDirs.length === 0) {
      throw new Error('No directories for entity discovery specified, please fill in `entitiesDirs` option');
    }

    if (!this.options.logger) {
      this.options.logger = (): void => null;
    }

    if (!this.options.baseDir) {
      this.options.baseDir = process.cwd();
    }

    if (!this.options.clientUrl) {
      this.options.clientUrl = 'mongodb://localhost:27017';
    }
  }

  async connect(): Promise<Db> {
    this.client = await MongoClient.connect(this.options.clientUrl as string);
    this.db = this.client.db(this.options.dbName);

    return this.db;
  }

  isConnected(): boolean {
    return this.client.isConnected(this.options.dbName);
  }

  async close(force = false): Promise<void> {
    return this.client.close(force);
  }

}

export interface Options {
  dbName: string;
  entitiesDirs: string[];
  logger?: Function;
  baseDir?: string;
  clientUrl?: string;
}
