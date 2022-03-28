import type { AbstractCursor } from 'mongodb';
import { EventEmitter } from 'events';
import * as stream from 'stream';
import { promisify } from 'util';
import { createCSVFormatter, createJSONFormatter } from '../utils/formatters';
const pipeline = promisify(stream.pipeline).bind(stream);

export interface CursorExporterOpts {
  cursor: AbstractCursor;
  type: 'csv' | 'json';
  columns: Array<string> | boolean;
  output: stream.Writable;
  totalNumberOfDocuments?: number;
}
export class CursorExporter extends EventEmitter {
  private _cursor: AbstractCursor;
  private _output: stream.Writable;
  private _formatter;
  private _columns: Array<string> | boolean;
  private _totalNumberOfDocuments: number;
  private _exportedDocuments = 0;
  constructor(opts: CursorExporterOpts) {
    super();
    this._cursor = opts.cursor;
    this._formatter =
      opts.type === 'csv' ? createCSVFormatter : createJSONFormatter;
    this._output = opts.output;
    this._columns = opts.columns ? opts.columns : true;
    this._totalNumberOfDocuments = opts.totalNumberOfDocuments || 0;
  }

  async start(): Promise<void> {
    await pipeline(
      this._cursor.stream(),
      this.getProgressTransformStream(),
      this.getFormatter(),
      this._output
    );
  }
  private getFormatter() {
    return this._formatter({ columns: this._columns });
  }
  private _getPercentageOfDocuments() {
    if (this._totalNumberOfDocuments) {
      return (this._exportedDocuments * 100) / this._totalNumberOfDocuments;
    }
    return 0;
  }
  private getProgressTransformStream() {
    const emit = this.emit.bind(this);
    return new stream.Transform({
      readableObjectMode: true,
      writableObjectMode: true,
      transform: (doc, encoding, callback) => {
        try {
          this._exportedDocuments++;
          emit('progress', {
            percentage: this._getPercentageOfDocuments(),
            transferred: this._exportedDocuments,
          });
        } catch (err) {
          // do nothing
        } finally {
          callback(null, doc);
        }
      },
    });
  }
}
