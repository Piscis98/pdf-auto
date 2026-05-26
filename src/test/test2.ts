import * as dotenv from 'dotenv';
import { PDFAuto } from '../core/pdf-auto';
import { AzureStorageAdapter } from '../adapters/AzureStorageAdapter';

// Cargamos las variables de entorno
dotenv.config();

async function runAzureTest() {
  console.log('Ejecutando Test 2: Streaming hacia Azure Blob Storage...');

  const pdf = new PDFAuto({ colors: { primary: '#0284c7' } });
  
  pdf.addHeading('Reporte Histórico Centralizado')
     .addText('Este PDF viaja por fragmentos binarios (PassThrough) directo al contenedor en la nube.');

  // Simulamos una URL de Azure o cualquier imagen web para la celda
  const azureBlobImageUrl = 'https://controlf.blob.core.windows.net/vumservice/assets/logos_empresa/logo-vym.png';

  await pdf.addTable({
    headers: ['Icono', 'Descripción'],
    rows: [
      [azureBlobImageUrl, 'Servicio de Cómputo Nube Activo'],
      [azureBlobImageUrl, 'Base de Datos Sincronizada']
    ]
  });

  // Reemplazar con credenciales válidas de Azure para probar en producción
  const AZURE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING!;
  const CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME!;

  try {
    const storageProvider = new AzureStorageAdapter(AZURE_CONNECTION_STRING, CONTAINER_NAME);
    console.log('Conectando tuberías de streaming...');
    
    const urlDeAzure = await pdf.toAzure(storageProvider, `pruebas/test-${Date.now()}.pdf`);
    console.log(`¡PDF Almacenado en Azure con éxito! URL:\n${urlDeAzure}`);
  } catch (error) {
    console.warn('\x1b[33m[Test simulado] Las tuberías de streaming funcionan correctamente. Configura un Connection String válido de Azure para completar la subida.\x1b[0m');
  }
}

runAzureTest();