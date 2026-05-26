import { PassThrough } from 'stream';

export interface IStorageProvider {
  uploadStream(fileName: string): {
    stream: PassThrough;
    promise: Promise<string>;
  };
}