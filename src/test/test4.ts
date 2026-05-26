import * as dotenv from 'dotenv';
import { PDFAuto } from '../core/pdf-auto';
import * as fs from 'fs';
import * as path from 'path';
import { AzureStorageAdapter } from '../adapters/AzureStorageAdapter';

// Cargamos las variables de entorno
dotenv.config();

// Mock de un Storage Provider básico para cumplir con la firma del constructor si fuera necesario
const mockStorageProvider = {
  uploadStream: (fileName: string) => ({
    stream: new (require('stream').PassThrough)(),
    promise: Promise.resolve(`https://mockstorage.blob.core.windows.net/pdfs/${fileName}`)
  })
};

async function runGridTest() {
  console.log('--- Iniciando Test del Generador de PDFs con Grid Estructurado ---');

  // Instanciamos el core configurando la paleta de colores corporativa
  const pdf = new PDFAuto({
    size: 'A4',
    margin: 30,
    colors: {
      primary: '#B20000',    // Rojo oscuro de cabeceras
      secondary: '#000000',  // Bordes negros
      text: '#1F2937',
      light: '#F3F4F6'
    }
  });

  // URL de prueba o Buffer (puedes reemplazarlo por una ruta local o tu Azure Blob URL)
  const logoUrl = 'https://yavuzceliker.github.io/sample-images/image-5.jpg';

  const logoUrl2='https://yavuzceliker.github.io/sample-images/image-1.jpg';

  // await pdf.addLogo(logoUrl);

  await pdf.addLogo(logoUrl, {
  position: 'center',
  size: 'large',
  moveDown: 1.5 // Deja más espacio abajo antes del título
});

  // 1. Encabezado principal del Documento
  pdf.addHeading('FICHA TÉCNICA DE CONTROL DE ACTIVOS DEAFULT');

  pdf.addHeading('FICHA TÉCNICA DE CONTROL DE ACTIVOS', {
    fontSize: 16,
    color: '#B20000',
    align: 'center',
    moveDown: 0.5
  });

  // =======================================================================
  // EJEMPLO 1: 3 Columnas en un renglón con los formatos por defecto (Label Negrita, Valor Normal)
  // =======================================================================
  pdf.addColumn([
    { label: 'Operador', value: 'Soporte TI Claro' },
    { label: 'Sede', value: 'Cali Principal' },
    { label: 'Piso', value: 'Bloque B - 4to Piso' }
  ],{ layout: 'inline' });

  pdf.addColumn([
    { label: 'Operador', value: 'Soporte TI Claro' },
    { label: 'Sede', value: 'Cali Principal' },
    { label: 'Piso', value: 'Bloque B - 4to Piso' }
  ],{ layout: 'inline' });

  pdf.addText('');

  pdf.addText('Reporte generado automáticamente para el control de hardware, estaciones de trabajo y periféricos asignados.');

  // =======================================================================
  // EJEMPLO 2: 2 Columnas anchas con personalización de colores corporativos y tamaño
  // =======================================================================
  pdf.addColumn([
    { label: 'Responsable del Inventario', value: 'Ing. Alejandro Gómez' },
    { label: 'Área Asignada', value: 'Dirección de Operaciones y Logística' }
  ], {
    layout: 'stacked',
    fontSize: 11,
    labelColor: '#B20000', // Rojo para el label
    valueColor: '#1F2937', // Gris oscuro para el valor
    labelBold: true,       // Forzar label en negrita
    valueBold: false,       // Forzar valor también en negrita (customizado)
    spaceAfter: 0.8        // Más separación con la siguiente sección
  });

  pdf.addText('Reporte generado automáticamente para el control de hardware, estaciones de trabajo y periféricos asignados.',{
    fontSize: 9,
    color: '#1F2937',
    isBold: false,
    align: 'center',
    moveDown: 0.5
  });
  pdf.addText('Reporte generado automáticamente para el control de hardware, estaciones de trabajo y periféricos asignados.');

  pdf.addText('Reporte generado automáticamente para el control de hardware, estaciones de trabajo y periféricos asignados.');

  pdf.addText('Reporte generado automáticamente para el control de hardware, estaciones de trabajo y periféricos asignados.<br>Este documento es confidencial y de uso exclusivo para fines de auditoría interna.<br>Reporte generado automáticamente para el control de hardware, estaciones de trabajo y periféricos asignados.'); // Prueba de salto de línea con <br>

  // ==========================================
  // FILA 1: BLOQUE DE CONTROL Y CONSECUTIVOS
  // ==========================================
  await pdf.addGridRow([
    { image: logoUrl, widthPercent: 35 }, // Espacio para el logo
    { text: 'SISTEMAS Y TECNOLOGÍA CONTROL INTERNO', isBold: true, fontSize: 10, align: 'center', widthPercent: 35 },
    { 
      text: 'FECHA DE EMISIÓN:\nVERSIÓN:\nCONSECUTIVO:', 
      fontSize: 8, 
      isBold: true, 
      backgroundColor: '#F3F4F6', 
      textColor: '#000000',
      widthPercent: 18 
    },
    { text: '25-may-2026\n1\n00179', fontSize: 8, align: 'center', widthPercent: 12 }
  ], { height: 45, spaceAfter: 5 });

  // ==========================================
  // FILA 2: NOMBRE DEL EQUIPO (ANCHO COMPLETO)
  // ==========================================
  await pdf.addGridRow([
    { text: 'Nombre del pc', isBold: true, backgroundColor: '#B20000', textColor: '#FFFFFF', widthPercent: 30 },
    { text: 'CLORECLUTA79', isBold: true, widthPercent: 70 }
  ], { height: 20, spaceAfter: 5 });

  // ==========================================
  // FILA 3: SECCIÓN SEPARADORA TITULO
  // ==========================================
  await pdf.addGridRow([
    { text: '1. DATOS DEL EQUIPO', isBold: true, fontSize: 10, widthPercent: 100 }
  ], { height: 18, spaceAfter: 2 });

  // ==========================================
  // FILA 4: MARCA, PROVEEDOR Y MODELO
  // ==========================================
  await pdf.addGridRow([
    { text: 'Marca', isBold: true, backgroundColor: '#B20000', textColor: '#FFFFFF', widthPercent: 15 },
    { text: 'ASUS', widthPercent: 20 },
    { text: 'Proveedor', isBold: true, backgroundColor: '#B20000', textColor: '#FFFFFF', widthPercent: 20 },
    { text: 'RENTING DE COLOMBIA S.A.S', widthPercent: 15 },
    { text: 'Modelo', isBold: true, backgroundColor: '#B20000', textColor: '#FFFFFF', widthPercent: 15 },
    { text: 'ASUS EXPERTBOOK P2451F', widthPercent: 15 }
  ], { height: 22, spaceAfter: 5 });

  // ==========================================
  // FILA 5: SECCIÓN SEPARADORA COMPONENTES
  // ==========================================
  await pdf.addGridRow([
    { text: '2. CONFIGURACIÓN DE HARDWARE', isBold: true, fontSize: 10, widthPercent: 100 }
  ], { height: 18, spaceAfter: 2 });

  // ==========================================
  // FILA 6: ACTIVO FIJO, SERIAL Y GARANTÍA
  // ==========================================
  await pdf.addGridRow([
    { text: 'N° Activo Fijo', isBold: true, backgroundColor: '#B20000', textColor: '#FFFFFF', widthPercent: 30 },
    { text: 'GSK-2021-17', widthPercent: 15 },
    { text: 'Serial', isBold: true, backgroundColor: '#B20000', textColor: '#FFFFFF', widthPercent: 15 },
    { text: 'M3NXCV24213913', widthPercent: 20 },
    { text: 'Fin de garantía', isBold: true, backgroundColor: '#B20000', textColor: '#FFFFFF', widthPercent: 10 },
    { text: '18-jul-26', widthPercent: 10 }
  ], { height: 25, spaceAfter: 5 });

  // ==========================================
  // FILA 7: ESPECIFICACIONES TÉCNICAS COMPLEJAS
  // ==========================================
  await pdf.addGridRow([
    { text: 'Procesador', isBold: true, backgroundColor: '#B20000', textColor: '#FFFFFF', widthPercent: 30 },
    { text: 'Intel(R) CORE(TM) i5-10210U CPU @ 1.60GHZ', fontSize: 8, widthPercent: 35 },
    { text: 'Fecha de registro del equipo', isBold: true, backgroundColor: '#B20000', textColor: '#FFFFFF', fontSize: 8, widthPercent: 20 },
    { text: '10/12/2021', align: 'center', widthPercent: 15 }
  ], { height: 30, spaceAfter: 0 });

  await pdf.addGridRow([
    { text: 'Disco duro', isBold: true, backgroundColor: '#B20000', textColor: '#FFFFFF', widthPercent: 30 },
    { text: 'Capacidad\n512 GB', fontSize: 8, widthPercent: 15 },
    { text: 'Tipo\nSólido M.2', fontSize: 8, widthPercent: 20 },
    { text: 'Memoria RAM', isBold: true, backgroundColor: '#B20000', textColor: '#FFFFFF', widthPercent: 15 },
    { text: 'Cantidad\n8 GB', fontSize: 8, widthPercent: 10 },
    { text: 'Tipo\nDDR4', fontSize: 8, widthPercent: 10 }
  ], { height: 30, spaceAfter: 15 });

  // 2. Renderizar una tabla estándar debajo del grid para asegurar compatibilidad mutua
  pdf.addHeading('Historial de Mantenimientos Preventivos');
  await pdf.addTable({
    headers: ['Fecha', 'Técnico Asignado', 'Descripción del Soporte'],
    rows: [
      [logoUrl, 'Ing. Carlos Mendoza', 'Limpieza física general y cambio de pasta térmica de la CPU.'],
      [logoUrl2, 'Soporte Infraestructura', 'Actualización de seguridad del Sistema Operativo Windows 11 PRO.']
    ]
  });

  await pdf.addTable({
    // headers: ['Fecha', 'Técnico Asignado', 'Descripción del Soporte'],
    headers: [
      { label: 'Fecha', property: 'fecha', width: '25%' },
      { label: 'Técnico Asignado', property: 'tecnico', width: '25%' },
      { label: 'Descripción del Soporte', property: 'descripcion', width: '50%' }
    ],
    rows: [
      [
        { 
          source: logoUrl, 
          width: 45, 
          height: 25 
        }, 'Ing. Carlos Mendoza', 'Limpieza física general y cambio de pasta térmica de la CPU.'],
      [logoUrl, 'Soporte Infraestructura', 'Actualización de seguridad del Sistema Operativo Windows 11 PRO.']
    ],
    // AQUÍ LE PASAS LAS OPCIONES DE BORDES
    options: {
      title: "Title", // or { label: 'Title', fontSize: 18, color: 'blue', fontFamily: "./fonts/type.ttf" }
      subtitle: "Subtitle",
      width: 500, 
      divider: {
        header: { disabled: false, width: 1, opacity: 1, color: '#000000' }, // Línea bajo la cabecera
        horizontal: { disabled: false, width: 0.5, opacity: 0.5, color: '#000000' }, // Líneas entre filas
        vertical: { disabled: false, width: 0.5, opacity: 0.5, color: '#000000' } // Líneas entre columnas (Cuadrícula)
      }
    }
  });

  await pdf.addSignatures([
    // FIRMA 1: El Líder (Solo sus datos, sin metadatos de auditoría)
    {
      source: logoUrl, // Reemplaza con la ruta a la imagen de la firma del líder
      imageSize: { width: 100, height: 45 },
      userData: [
        { text: 'Ing. Carlos Mendoza', isBold: true, fontSize: 10, color: '#B20000' }, // Nombre grande y rojo
        { text: 'Director de Infraestructura y TI', fontSize: 8.5 },
        { text: 'Vision & Marketing S.A.S', fontSize: 7.5, color: '#6B7280' }
      ]
    },
    
    // FIRMA 2: Tú como Usuario (Con metadatos de IP, correo y hora al lado de la firma)
    {
      source: logoUrl2, // Reemplaza con la ruta a tu imagen de firma
      imageSize: { width: 90, height: 45 },
      userData: [
        { text: 'Alejandro Gómez', isBold: true, fontSize: 10 }, // Nombre destacado
        { text: 'Técnico de Soporte Asignado', fontSize: 8.5 },
        { text: 'C.C. 1.006.123.456', fontSize: 8 }
      ],
      // AQUÍ VAN TUS DATOS DINÁMICOS DE AUDITORÍA
      metadata: [
        { label: 'IP Origen', value: '192.168.1.45' },
        { label: 'Correo', value: 'clorecluta79@vision.com' },
        { label: 'Fecha', value: '25-May-2026' },
        { label: 'Hora', value: '16:27:00 COT' }
      ]
    }
  ], {
    layout: 'inline', // Una al lado de la otra
    spaceBefore: 1.5, // Buen espacio de separación con la tabla de arriba
    lineColor: '#9CA3AF' // Color gris medio para las líneas de firma
  });

  await pdf.addSignatures([
    // FIRMA 1: El Líder (Arriba, con sus propios metadatos de aprobación)
    {
      source: logoUrl, // Reemplaza con la ruta a la imagen de la firma del líder
      imageSize: { width: 110, height: 45 },
      userData: [
        { text: 'Ing. Carlos Mendoza', isBold: true, fontSize: 10, color: '#B20000' },
        { text: 'Director de Infraestructura y TI / Coordinador General', fontSize: 9 },
        { text: 'Aprobado vía Módulo de Control Interno', fontSize: 8, color: '#059669' } // Texto verde de éxito
      ],
      metadata: [
        { label: 'Rol', value: 'Autorizador' },
        { label: 'Fecha Aprobación', value: '25-May-2026' },
        { label: 'Hash de Firma', value: 'a8f9e2...3c1b' }
      ]
    },
    
    // FIRMA 2: Tú como Usuario (Abajo, con tus datos de auditoría de creación)
    {
      source: logoUrl2, // Reemplaza con la ruta a tu imagen de firma
      imageSize: { width: 100, height: 45 },
      userData: [
        { text: 'Alejandro Gómez', isBold: true, fontSize: 10 },
        { text: 'Técnico de Soporte Operativo', fontSize: 9 },
        { text: 'C.C. 1.006.123.456', fontSize: 8.5 }
      ],
      metadata: [
        { label: 'IP Origen', value: '192.168.1.45' },
        { label: 'Dispositivo', value: 'ASUS_EXPERTBOOK_P2451F' }, // Datos de tu activo actual
        { label: 'Hora Registro', value: '16:27:00 COT' }
      ]
    }
  ], {
    layout: 'stacked',       // OBLIGA A QUE SALGAN UNA DEBAJO DE LA OTRA
    spaceBefore: 2,          // Separación generosa con el contenido anterior
    spaceAfter: 1,           // Espacio al terminar la última firma
    lineColor: '#4B5563',    // Un gris más oscurito y marcado para la línea de la firma
    metadataOptions: {
      fontSize: 7.5,         // Un pelín más grande el texto de auditoría ya que hay espacio de sobra
      labelColor: '#374151'  // Color gris oscuro para los labels de los metadatos
    }
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

// Ejecutar el script de prueba
runGridTest();