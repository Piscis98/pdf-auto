# PDFAuto 🚀

Un motor de maquetación de PDFs ultra-eficiente y agnóstico construido sobre **PDFKit-Table** y **TypeScript**. Diseñado específicamente para sistemas que requieren alta disponibilidad, bajo consumo de memoria RAM y flujos automatizados que interactúan con almacenamiento local, remoto o proveedores de nube como Azure.

[![npm version](https://img.shields.io/npm/v/pdf-auto.svg?style=flat-square&color=1E3A8A)](https://www.npmjs.com/package/pdf-auto)
[![license](https://img.shields.io/npm/l/@piscisdev/pdf-auto.svg?style=flat-square&color=4B5563)](./LICENSE)
[![typescript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![environment](https://img.shields.io/badge/Node.js-%3E%3D18-green?style=flat-square&logo=node.js)](https://nodejs.org/)

---

## ✨ Características Principales

* **⚡ Low-Memory Optimization:** Procesa flujos de imágenes (URLs o paths locales) convirtiéndolos inmediatamente en `Buffers` binarios puros, evitando la sobrecarga y el lag transaccional de strings pesados en Base64.
* **📦 Caché Volátil Integrada:** Cuenta con una caché por instancia para evitar lecturas repetidas en disco duro o descargas redundantes mediante peticiones HTTPS simultáneas.
* **📐 Tablas Inteligentes:** Distribución de columnas mediante píxeles o porcentajes exactos (`width: '20%'`), con centrado matemático perfecto de imágenes internas e inmunidad ante pre-renderizados erráticos de grilla.
* **🧱 Grid de Filas Fluido (`addGridRow`):** Permite construir estructuras tipo bloque/ficha técnica con bordes controlados y fondos de color personalizados.
* **📊 Columnas Dinámicas (`addColumn`):** Soporta maquetaciones automáticas de texto de 1 a N columnas con diseños paralelos (`inline`) o en bloque (`stacked`).
* **🎯 Logotipos Flexibles (`addLogo`):** Manejo de escalas estándar (`small`, `medium`, `large`) o dimensiones explícitas con posicionamiento automático por alineación o coordenadas fijas.
* **🖋️ Firmas de Auditoría Avanzadas (`addSignatures`):** Sistema multi-firma (horizontal o vertical) con líneas divisorias simétricas y bloques laterales flotantes para estampar metadatos de seguridad (IPs, correos, timestamps, hashes).
* **☁️ Estrategia de Salida Dual (Cloud Ready):** Retorna un `Buffer` para consumo directo en memoria o se conecta mediante inversión de dependencias vía streams directo a Azure Blob Storage sin generar archivos temporales locales.

---

## 💻 Instalación

Instalación recomendada

```bash
npm install pdf-auto

```
Paquete scoped (compatible)

```bash
npm install @piscisdev/pdf-auto

```

---

## 🚀 Arquitectura de Uso Rápido

A continuación se detalla un flujo punta a punta en **TypeScript** utilizando la API fluida del motor de renderizado:

```typescript
import { PDFAuto } from 'pdf-auto';//Recomendado
//Compatible
//import { PDFAuto } from '@piscisdev/pdf-auto';
import * as fs from 'fs';

async function generateReport() {
  // 1. Inicialización Base con Paleta Corporativa
  const pdf = new PDFAuto({
    size: 'A4',
    margin: 40,
    colors: {
      primary: '#1E3A8A',   // Color corporativo para Títulos, Cabeceras y Labels
      secondary: '#9CA3AF', // Color para líneas y bordes divisorios
      text: '#1F2937',      // Color base del texto de lectura
      light: '#F3F4F6'      // Fondo para celdas o bloques
    }
  });

  // 2. Insertar Logotipos y Encabezados con Aislamiento de Lienzo
  await pdf.addLogo('[https://tuservidor.com/assets/logo-empresa.png](https://tuservidor.com/assets/logo-empresa.png)', {
    position: 'right',
    size: 'small',
    moveDown: 1
  });

  pdf.addHeading('INVENTARIO INTERNO DE ACTIVOS TI', {
    align: 'center',
    fontSize: 22,
    moveDown: 1
  });

  // 3. Texto en Bloques de Columnas Equitativas
  pdf.addColumn([
    { label: 'Sede', value: 'Cali Principal' },
    { label: 'Área', value: 'Infraestructura' },
    { label: 'Responsable', value: 'Ing. Alejandro Gómez' }
  ], { layout: 'inline', fontSize: 10, spaceAfter: 1.5 });

  // 4. Tablas Robustas con Imágenes Dinámicas y Porcentajes
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
        '[https://servidor-remoto.com/imagenes/periferico.png](https://servidor-remoto.com/imagenes/periferico.png)',
        'Teclado Mecánico Corporativo USB-C.'
      ]
    ]
  });

  // 5. Bloque de Firmas Estructuradas con Datos de Auditoría Flotantes
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
      metadata: [
        { label: 'IP Origen', value: '192.168.1.45' },
        { label: 'Registro UTC', value: '26-May-2026 16:27 COT' }
      ]
    }
  ], { layout: 'inline', spaceBefore: 2 });

  // 6. Exportación a un Buffer local
  const pdfBuffer = await pdf.toBuffer();
  fs.writeFileSync('reporte-activos.pdf', pdfBuffer);
}

generateReport().catch(console.error);

```

---

## ☁️ Almacenamiento en la Nube (Azure Blob Storage Adapter)

Gracias a la abstracción por streaming, puedes inyectar los bytes de tu PDF directamente al SDK de Azure a medida que se generan, optimizando los picos de consumo en RAM dentro de contenedores:

```typescript
import { PDFAuto, AzureStorageAdapter } from 'pdf-auto';//Recomendado
//Compatible
//import { PDFAuto, AzureStorageAdapter } from '@piscisdev/pdf-auto';

const storageProvider = new AzureStorageAdapter(
  process.env.AZURE_CONNECTION_STRING!,
  'contenedor-pdf-reportes'
);

const pdf = new PDFAuto();
pdf.addHeading('REPORTE DIRECTO EN LA NUBE');
// ... Agrega el resto de tus componentes ...

// Pipe continuo sin almacenamiento temporal local
const azureUrl = await pdf.toAzure(storageProvider, 'reporte-activos-2026.pdf');
console.log(`Documento subido con éxito: ${azureUrl}`);

```

---

## 🛠️ Métodos Disponibles

| Método | Parámetros Clave | Propósito |
| --- | --- | --- |
| `addPage()` | Ninguno | Añade de forma limpia una nueva página restableciendo fuentes y pinceles de lectura. |
| `addHeading()` | `text`, `options` (fontSize, color, align, moveDown) | Renderiza títulos con aislamiento estricto del estado gráfico global. |
| `addText()` | `text` (soporta `<br>`), `options` (isBold, fontSize, align, moveDown) | Inserta texto multi-línea fluido sin alterar configuraciones de pincel. |
| `addImage()` | `source`, `options` (width, height, align, x, y) | Dibuja una imagen en el cursor actual o en coordenadas absolutas en píxeles. |
| `addTable()` | `tableData` (headers, rows, options) | Genera grillas complejas adaptando anchos dinámicos, porcentajes e imágenes en celdas. |
| `addGridRow()` | `cells`, `options` (height, spaceAfter) | Diseña registros horizontales (tipo ficha) con fondos de color personalizados. |
| `addColumn()` | `columns`, `options` (layout: 'inline'/'stacked', spaceAfter, metrics) | Distribuye textos de tipo clave-valor equitativamente en el ancho del lienzo. |
| `addLogo()` | `source`, `options` (size: s/m/l, position: l/c/r o {x,y}, moveDown) | Sitúa isotipos y logos empresariales calculando flujos de texto de forma inteligente. |
| `addSignatures()` | `signatures`, `options` (layout: inline/stacked, lineColor, metadataOptions) | Estampa bloques formales de firma con trazado de línea y metadatos de auditoría. |
| `toBuffer()` | Ninguno | Procesa el flujo completo del documento y retorna un `Promise<Buffer>` optimizado. |
| `toAzure()` | `storageProvider`, `fileName` | Transmite el PDF directamente a un contenedor de Azure Blob Storage mediante streams puros. |

---

## 📐 Referencia de Tipos e Interfaces (TypeScript)

### Configuración del Documento

```typescript
export interface PDFAutoColors {
  primary?: string;
  secondary?: string;
  text?: string;
  light?: string;
}

export interface PDFAutoOptions {
  size?: string;
  layout?: 'portrait' | 'landscape';
  margin?: number;
  colors?: PDFAutoColors;
  fonts?: { body: string; bold: string };
}

```

### Tablas de Datos (`addTable`)

```typescript
export interface TableHeaderObject {
  label: string;
  property: string;
  width?: number | string; // Permite strings con porcentajes: '25%'
  align?: 'left' | 'center' | 'right';
}

export interface PDFAutoTableData {
  headers: (string | TableHeaderObject)[];
  rows: (string | number | Buffer | { source: string; width?: number; height?: number })[][];
  options?: Record<string, any>;
}

```

### Bloques tipo Ficha (`addGridRow`)

```typescript
export interface GridCell {
  text?: string;
  image?: string | Buffer;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  isBold?: boolean;
  align?: 'left' | 'center' | 'right';
  widthPercent: number; // La suma total de los bloques de la fila debe dar exactamente 100
}

```

### Abstracción de Almacenamiento Nube

```typescript
export interface IStorageProvider {
  uploadStream(fileName: string): {
    stream: import('stream').PassThrough;
    promise: Promise<string>;
  };
}

```

---

## 📄 Licencia

Este proyecto está bajo la **Licencia MIT**.

* Copyright (c) 2026 **BAIRON STIVEN RAMIREZ MARIN** (`Piscis98`).
* Portions Copyright (c) 2022 **Natan Cabral** (Conserva los términos y derechos originales aplicados al núcleo del lienzo).

Consulte el archivo [LICENSE](https://github.com/Piscis98/pdf-auto/blob/master/LICENSE) para obtener más detalles.

```