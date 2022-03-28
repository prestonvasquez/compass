import { Writable } from 'stream';
import { CursorExporter } from './CursorExporter';
import type { CursorExporterOpts } from './CursorExporter';
import { expect } from 'chai';
import { spy } from 'sinon';
import { MongoClient, ObjectId } from 'mongodb';
import type { Collection, Document } from 'mongodb';
class StringStream extends Writable {
  public output = '';
  constructor() {
    super();
  }
  _write(chunk, enc, next) {
    this.output += chunk.toString();
    next();
  }
  getOutput() {
    return this.output;
  }
}
const sampleDocuments = [
  {
    _id: new ObjectId('OKOKOKOKOKOK'),
    first_name: 'John',
    last_name: 'Appleseed',
  },
];
describe('CursorExporter', function () {
  this.timeout(5000);
  let cursor;
  let client: MongoClient;
  let testCollectionName: string;
  let collection: Collection<Document>;
  let outputStream: StringStream;

  describe('Aggregations', function () {
    beforeEach(async function () {
      testCollectionName = 'cursor-exporter-test-' + Date.now().toString();
      client = new MongoClient('mongodb://localhost:27018/test');
      collection = client.db().collection(testCollectionName);
      outputStream = new StringStream();
      await client.connect();
      await collection.insertMany(sampleDocuments);
      cursor = collection.aggregate([{ $match: { first_name: 'John' } }]);
    });
    afterEach(async function () {
      await collection.drop();
      await client.close();
    });
    it('should export AggregateCursor', async function () {
      const opts: CursorExporterOpts = {
        cursor,
        type: 'csv',
        output: outputStream,
        columns: true,
      };
      const exporter = new CursorExporter(opts);
      await exporter.start();
      expect(outputStream.getOutput()).to.be.equal(
        '_id,first_name,last_name\n4f4b4f4b4f4b4f4b4f4b4f4b,John,Appleseed'
      );
    });
  });
  describe('Documents', function () {
    beforeEach(async function () {
      testCollectionName = 'cursor-exporter-test-' + Date.now().toString();
      client = new MongoClient('mongodb://localhost:27018/test');
      collection = client.db().collection(testCollectionName);
      outputStream = new StringStream();
      await client.connect();
      await collection.insertMany(sampleDocuments);
      cursor = collection.find();
    });
    afterEach(async function () {
      await collection.drop();
      await client.close();
    });
    describe('Formatters', function () {
      describe('CSV', function () {
        it('should export all documents', async function () {
          const opts: CursorExporterOpts = {
            cursor,
            type: 'csv',
            output: outputStream,
            columns: true,
          };
          const exporter = new CursorExporter(opts);
          await exporter.start();
          expect(outputStream.getOutput()).to.be.equal(
            '_id,first_name,last_name\n4f4b4f4b4f4b4f4b4f4b4f4b,John,Appleseed'
          );
        });
        it('should export documents with only defined columns', async function () {
          const opts: CursorExporterOpts = {
            cursor,
            type: 'csv',
            output: outputStream,
            columns: ['_id', 'first_name'],
          };
          const exporter = new CursorExporter(opts);
          await exporter.start();
          expect(outputStream.getOutput()).to.be.equal(
            '_id,first_name\n4f4b4f4b4f4b4f4b4f4b4f4b,John'
          );
        });
      });

      describe('JSON', function () {
        it('should export all documents', async function () {
          const opts: CursorExporterOpts = {
            cursor,
            type: 'json',
            output: outputStream,
            columns: true,
          };
          const exporter = new CursorExporter(opts);
          await exporter.start();
          expect(JSON.parse(outputStream.getOutput())).to.be.deep.equal([
            {
              _id: { $oid: '4f4b4f4b4f4b4f4b4f4b4f4b' },
              first_name: 'John',
              last_name: 'Appleseed',
            },
          ]);
        });
      });
    });
    describe('Events', function () {
      it('should emit "progress" event for each document', async function () {
        const data = [
          { first_name: 'Alice' },
          { first_name: 'Bob' },
          { first_name: 'Charlie' },
          { first_name: 'Diana' },
        ];
        await collection.insertMany(data);
        const onProgress = spy();
        const exporter = new CursorExporter({
          cursor: collection.find(),
          type: 'csv',
          output: outputStream,
          columns: true,
        });
        exporter.on('progress', onProgress);
        await exporter.start();
        expect(onProgress.callCount).to.equal(5);
      });
      it('should send progress stats', async function () {
        const data = [
          { first_name: 'Alice' },
          { first_name: 'Bob' },
          { first_name: 'Charlie' },
          { first_name: 'Diana' },
        ];
        await collection.insertMany(data);
        const onProgress = spy();
        const exporter = new CursorExporter({
          cursor: collection.find(),
          type: 'csv',
          output: outputStream,
          columns: true,
          totalNumberOfDocuments: 5,
        });
        exporter.on('progress', onProgress);
        await exporter.start();
        for (let i = 0; i < 4; i++) {
          const progressCall = onProgress.getCall(i);
          expect(
            progressCall.calledWith({
              percentage: 20 * (i + 1),
              transferred: i + 1,
            })
          ).to.be.true;
        }
      });
    });
    it('should pause export', function () {});
  });
});
