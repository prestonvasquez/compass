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
}
export class CursorExporter extends EventEmitter {
  private _cursor: AbstractCursor;
  private _output: stream.Writable;
  private _formatter;
  private _columns: Array<string> | boolean;
  constructor(opts: CursorExporterOpts) {
    super();
    this._cursor = opts.cursor;
    this._formatter =
      opts.type === 'csv' ? createCSVFormatter : createJSONFormatter;
    this._output = opts.output;
    this._columns = opts.columns ? opts.columns : true;
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
  private getProgressTransformStream() {
    const emit = this.emit.bind(this);
    return new stream.Transform({
      readableObjectMode: true,
      writableObjectMode: true,
      transform: (doc, encoding, callback) => {
        try {
          emit('progress');
        } catch (err) {
          // do nothing
        } finally {
          callback(null, doc);
        }
      },
    });
  }
}
