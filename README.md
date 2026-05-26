# PDFAuto 🚀

Un motor de maquetación de PDFs ultra-eficiente y agnóstico construido sobre **PDFKit-Table** y **TypeScript**. Diseñado específicamente para sistemas que requieren alta disponibilidad, bajo consumo de memoria RAM y flujos automatizados que interactúan con almacenamiento local, remoto o proveedores de nube como Azure.

## ✨ Características Principales

* **Low-Memory Optimization:** Procesa flujos de imágenes (`URLs` o paths locales) convirtiéndolos inmediatamente en `Buffers` binarios puros, evitando la sobrecarga de strings en Base64.
* **Caché Volátil Integrada:** Cuenta con una caché por instancia para evitar lecturas repetidas en disco duro o descargas redundantes mediante peticiones HTTPS simultáneas.
* **Tablas Inteligentes:** Distribución de columnas mediante píxeles o porcentajes exactos (`width: '20%'`), con centrado matemático perfecto de imágenes internas e inmunidad ante pre-renderizados erráticos de grilla.
* **Grid de Filas Fluido (`addGridRow`):** Permite construir estructuras tipo bloque/ficha técnica con bordes controlados y fondos de color.
* **Columnas Dinámicas (`addColumn`):** Soporta maquetaciones automáticas de texto de 1 a N columnas con diseños paralelos (`inline`) o en bloque (`stacked`).
* **Logotipos Flexibles (`addLogo`):** Manejo de escalas estándar (`small`, `medium`, `large`) o dimensiones explícitas con posicionamiento por coordenadas fijas.
* **Firmas de Auditoría Avanzadas (`addSignatures`):** Sistema multi-firma (horizontal o vertical) con líneas divisorias simétricas y bloques laterales flotantes para estampar metadatos de seguridad (IPs, correos, timestamps, hashes).
* **Estrategia de Salida Dual:** Retorna un `Buffer` para consumo directo en memoria o se integra nativamente vía streams a proveedores como Azure Blob Storage.

---

## 📦 Requisitos e Instalación

Asegúrate de contar con las siguientes dependencias instaladas en tu proyecto de Node.js:

```bash
npm install @piscisdev/pdf-auto

```

## 🛠️ Arquitectura de Uso Rápido

### 1. Inicialización Base

```typescript
import { PDFAuto } from '@piscisdev/pdf-auto';

const pdf = new PDFAuto({
  size: 'A4',
  margin: 40,
  colors: {
    primary: '#1E3A8A',   // Color corporativo para Títulos, Cabeceras de Tabla y Labels
    secondary: '#9CA3AF', // Color para líneas y bordes divisorios
    text: '#1F2937'       // Color base del texto de lectura
  }
});

```

### 2. Insertar Encabezados y Logotipos

```typescript
// Coloca el logo de la empresa arriba a la derecha con escala pequeña
await pdf.addLogo('[https://tuservidor.com/assets/logo-empresa.png](https://tuservidor.com/assets/logo-empresa.png)', {
  position: 'right',
  size: 'small'
});

pdf.addHeading('INVENTARIO INTERNO DE ACTIVOS TI', {
  align: 'center',
  fontSize: 22,
  moveDown: 1
});

```

### 3. Texto en Bloques de Columnas

```typescript
// Datos básicos organizados lado a lado de forma automática
pdf.addColumn([
  { label: 'Sede', value: 'Cali Principal' },
  { label: 'Área', value: 'Infraestructura' },
  { label: 'Responsable', value: 'Ing. Alejandro Gómez' }
], { layout: 'inline', fontSize: 10 });

```

### 4. Tablas Robustas con Imágenes Dinámicas

```typescript
await pdf.addTable({
  headers: [
    { label: 'Vista previa', width: '25%' },
    { label: 'Descripción del Elemento', width: '75%' }
  ],
  rows: [
    [
      { source: './assets/fotos/laptop.png', width: 40, height: 40 },
      'Laptop ASUS ExpertBook Intel i7, 16GB RAM, 512GB SSD. Sello de seguridad intacto.'
    ],
    [
      '[https://servidor-remoto.com/imagenes/periferico.png](https://servidor-remoto.com/imagenes/periferico.png)', // Usa tamaño por defecto de tabla
      'Teclado Mecánico Corporativo USB-C.'
    ]
  ]
});

```

### 5. Bloque de Firmas Estructuradas con Datos de Auditoría

```typescript
await pdf.addSignatures([
  {
    source: '[https://tuservidor.com/firmas/firma_jefe.png](https://tuservidor.com/firmas/firma_jefe.png)',
    userData: [
      { text: 'Ing. Carlos Mendoza', isBold: true },
      { text: 'Director de Infraestructura TI' }
    ]
  },
  {
    source: './assets/firmas/mi_firma.png',
    userData: [
      { text: 'Alejandro Gómez', isBold: true },
      { text: 'Técnico de Soporte Asignado' }
    ],
    // Metadatos que se estamparán al lado derecho de esta firma
    metadata: [
      { label: 'IP Origen', value: '192.168.1.45' },
      { label: 'Registro UTC', value: '25-May-2026 16:27 COT' }
    ]
  }
], { layout: 'inline', spaceBefore: 2 });

```

### 6. Exportación del Archivo

```typescript
// Opción A: Obtener Buffer binario para enviar por HTTP, guardar en disco, etc.
const pdfBuffer = await pdf.toBuffer();

// Opción B: Subir directamente a Azure Storage mediante Streams optimizados
const azureUrl = await pdf.toAzure(azureStorageProvider, 'reporte-activos-2026.pdf');

```

---

## 🛠️ Métodos Disponibles

| Método | Parámetros Clave | Propósito |
| --- | --- | --- |
| `addPage()` | Ninguno | Añade de forma limpia una nueva página restableciendo fuentes y pinceles. |
| `addHeading()` | `text`, `options` (fontSize, color, align, moveDown) | Renderiza títulos con aislamiento de estado gráfico. |
| `addText()` | `text` (soporta `<br>`), `options` (isBold, size, align) | Inserta texto multi-línea fluido sin alterar configuraciones globales. |
| `addImage()` | `source`, `options` (width, height, align, x, y) | Dibuja una imagen en el cursor actual o en coordenadas absolutas. |
| `addTable()` | `tableData` (headers, rows, options) | Genera grillas complejas adaptando anchos dinámicos e imágenes en celdas. |
| `addGridRow()` | `cells`, `options` (height, spaceAfter) | Diseña registros horizontales con fondos de color personalizados. |
| `addColumn()` | `columns`, `options` (layout: 'inline'/'stacked', colors) | Distribuye textos de tipo clave-valor equitativamente en el ancho de página. |
| `addLogo()` | `source`, `options` (size: s/m/l, position: l/c/r o {x,y}) | Sitúa isotipos y logos empresariales de forma inteligente. |
| `addSignatures()` | `signatures`, `options` (layout: inline/stacked, metadataOptions) | Estampa bloques formales de firma con trazado de línea y datos de auditoría. |
| `toBuffer()` | Ninguno | Procesa el flujo del documento y retorna un `Promise<Buffer>` optimizado en memoria. |
| `toAzure()` | `provider`, `blobName` | Transmite el PDF directamente a un contenedor de Azure Blob Storage mediante streams. |

## 📝 Licencia

Este proyecto es de uso privado e interno para la automatización y optimización de documentos digitales.

```

```