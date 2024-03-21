import { EntityFactory } from '../lib/EntityFactory';
import { Book } from './entities/Book';
import { Author } from './entities/Author';
import { EntityManager } from '../lib';

const Mock = jest.fn<EntityManager>(() => ({
  connection: jest.fn(),
  identityMap: jest.fn(),
  options: {
    baseDir: __dirname,
    entitiesDirs: ['entities'],
    logger: jest.fn(),
  },
  getReference: jest.fn(),
}));
const em = new Mock();
const factory = new EntityFactory(em);
em.entityFactory = factory;

/**
 * @class EntityFactoryTest
 */
describe('EntityFactory', () => {

  test('should load entities', async () => {
    const metadata = factory.getMetadata();
    // console.log(require('util').inspect(metadata, true, 5, true));
    expect(metadata).toBeInstanceOf(Object);
    expect(metadata[Author.name]).toBeInstanceOf(Object);
    expect(metadata[Author.name].path).toBe(__dirname + '/entities/Author.ts');
    expect(metadata[Author.name].properties).toBeInstanceOf(Object);
    expect(metadata[Author.name].properties['books'].type).toBe(Book.name);
    expect(metadata[Author.name].properties['books'].reference).toBe(true);
    expect(metadata[Author.name].properties['books'].collection).toBe(true);
    expect(metadata[Book.name].properties['author'].type).toBe(Author.name);
    expect(metadata[Book.name].properties['author'].reference).toBe(true);
    expect(metadata[Book.name].properties['author'].collection).toBe(false);
  });

  test('should return reference', async () => {
    const ref = factory.createReference<Book>(Book.name, '5b0d19b28b21c648c2c8a600');
    expect(ref).toBeInstanceOf(Book);
    expect(ref.id).toBe('5b0d19b28b21c648c2c8a600');
    expect(ref.name).toBeUndefined();
  });

  test('should return entity', async () => {
    const entity = factory.create<Author>(Author.name, { id: '5b0d19b28b21c648c2c8a600', name: 'test', email: 'mail@test.com' });
    expect(entity).toBeInstanceOf(Author);
    expect(entity.id).toBe('5b0d19b28b21c648c2c8a600');
    expect(entity.name).toBe('test');
    expect(entity.email).toBe('mail@test.com');
  });

});
