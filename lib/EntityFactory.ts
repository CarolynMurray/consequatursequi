import { readdirSync } from 'fs';
import { ObjectID } from 'bson';

import { getMetadataStorage, Options } from './MikroORM';
import { Collection } from './Collection';
import { EntityManager } from './EntityManager';
import { BaseEntity, EntityMetadata } from './BaseEntity';

export class EntityFactory {

  private metadata = getMetadataStorage();
  private options: Options = this.em.options;
  private logger = this.em.options.logger as Function;

  constructor(private em: EntityManager) {
    this.loadMetadata();
  }

  getMetadata(): { [entity: string]: EntityMetadata } {
    return this.metadata;
  }

  create<T extends BaseEntity>(entityName: string, data: any): T {
    const meta = this.metadata[entityName];
    const exclude = [];
    let entity;

    // TODO test those conditions if we really need them both
    if (data.id && !data._id) {
      data._id = new ObjectID(data.id);
      delete data.id;
    }

    // TODO test those conditions if we really need them both
    if (data._id && typeof data._id === 'string') {
      data._id = new ObjectID(data._id);
    }

    if (this.em.identityMap[`${entityName}-${data._id}`]) {
      entity = this.em.identityMap[`${entityName}-${data._id}`];
    } else {
      const params = this.extractConstructorParams<T>(meta, data);
      const Entity = require(meta.path)[entityName];
      entity = new Entity(...params);
      exclude.push(...meta.constructorParams);
    }

    this.initEntity(entity, meta.properties, data, exclude);

    return entity;
  }

  private initEntity<T extends BaseEntity>(entity: T, properties: any, data: any, exclude: string[] = []): void {
    // process base entity properties first
    ['_id', 'createdAt', 'updatedAt'].forEach(k => {
      if (data[k]) {
        entity[k] = data[k];
      }
    });

    // then process user defined properties (ignore not defined keys in `data`)
    Object.keys(properties).forEach(p => {
      const prop = properties[p];

      if (exclude.includes(p)) {
        return;
      }

      if (prop.collection && !entity['_' + p]) {
        entity['_' + p] = new Collection<T>(prop, entity);
        Object.defineProperty(entity, p, {get: function () {
          if (!entity['_' + p].isInitialized()) {
            throw new Error(`Entity reference '${entity.constructor.name}.${p}' not initialized, call 'entity.init(em)' first!`);
          }

          return entity['_' + p];
        }});
      } else if (prop.reference && !prop.collection) {
        if (data[p] instanceof ObjectID) {
          entity[p] = this.createReference(prop.type, data[p]);
        }
      } else if (data[p] && !prop.reference) {
        entity[p] = data[p];
      }
    });

    delete entity['_initialized'];
  }

  createReference<T extends BaseEntity>(entityName: string, id: string): T {
    const ref = this.create<T>(entityName, { id });
    (ref as any)['_initialized'] = false;

    return ref;
  }

  private extractConstructorParams<T extends BaseEntity>(meta: EntityMetadata, data: any): any[] {
    return meta.constructorParams.map((k: string) => {
      if (meta.properties[k].reference && !meta.properties[k].collection) {
        return this.em.getReference<T>(meta.properties[k].type, data[k]);
      }

      return data[k];
    });
  }

  private loadMetadata(): any {
    const startTime = Date.now();
    this.logger(`ORM entity discovery started`);

    this.options.entitiesDirs.forEach(dir => this.discover(dir));
    const diff = Date.now() - startTime;
    this.logger(`- entity discovery finished after ${diff} ms`);
  }

  private discover(basePath: string) {
    const files = readdirSync(this.options.baseDir + '/' + basePath);

    files.forEach(file => {
      if (file.lastIndexOf('.ts') === -1 || file.startsWith('.')) {
        return;
      }

      this.logger(`- processing entity ${file}`);
      const name = file.split('.')[0];
      const path = `${this.options.baseDir}/${basePath}/${file}`;
      require(path);

      this.metadata[name].path = path;
      this.metadata[name].entity = name;

      // init types
      const props = this.metadata[name].properties;
      Object.keys(props).forEach(p => {
        if (props[p].entity) {
          this.metadata[name].properties[p].type = props[p].entity();
        }
      });
    });
  }

}
