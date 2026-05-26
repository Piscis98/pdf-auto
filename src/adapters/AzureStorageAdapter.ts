import { BlobServiceClient } from '@azure/storage-blob';
import { PassThrough } from 'stream';
import { IStorageProvider } from '../interfaces/storage.interface';

export class AzureStorageAdapter implements IStorageProvider {
  private containerClient;

  constructor(connectionString: string, containerName: string) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = blobServiceClient.getContainerClient(containerName);
  }

  /**
   * Crea un puente (stream) hacia Azure
   */
  public uploadStream(fileName: string) {
    const passthrough = new PassThrough();
    const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);

    // El SDK de Azure acepta un stream directamente
    const promise = blockBlobClient.uploadStream(passthrough, undefined, undefined, { blobHTTPHeaders: { blobContentType: 'application/pdf' } })
      .then(() => blockBlobClient.url); // Retorna la URL final

    return { stream: passthrough, promise };
  }
}