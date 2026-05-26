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

export interface ImageOptions {
  width?: number;
  height?: number;
  align?: 'left' | 'center' | 'right';
}

export interface TableHeaderObject {
  label: string;
  property: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

export interface PDFAutoTableData {
  headers: (string | TableHeaderObject)[];
  rows: (string | number | Buffer | { source: string; width?: number; height?: number })[][];
  options?: Record<string, any>;
}

export interface GridCell {
  text?: string;
  image?: string | Buffer;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  isBold?: boolean;
  align?: 'left' | 'center' | 'right';
  /** Porcentaje de ancho de la celda (Ej: 20 para 20%). La suma de la línea debe dar 100 */
  widthPercent: number; 
}

export interface GridRowOptions {
  /** Alto fijo para toda la fila de rectángulos */
  height: number;
  /** Espaciado inferior después de la fila */
  spaceAfter?: number;
}

export interface ColumnItem {
  label: string;
  value: string;
}

export interface ColumnRowOptions {
  /** Forzar a que el Label sea o no Negrita de forma global para la fila (Por defecto: true) */
  labelBold?: boolean;
  /** Forzar a que el Valor sea o no Negrita de forma global para la fila (Por defecto: false) */
  valueBold?: boolean;
  /** Tamaño de fuente para toda la fila (Por defecto: 10) */
  fontSize?: number;
  /** Color del Label (Por defecto: El color primario de la config) */
  labelColor?: string;
  /** Color del Valor (Por defecto: El color de texto de la config) */
  valueColor?: string;
  /** Espacio vertical a dejar después de renderizar la fila de columnas (Por defecto: 0.4) */
  spaceAfter?: number;
}

export interface LogoOptions {
  /** Alineación estándar o coordenadas fijas { x: number, y: number } */
  position?: 'left' | 'center' | 'right' | { x: number; y: number };
  /** Tamaños predefinidos o dimensiones exactas en píxeles { width: number, height?: number } */
  size?: 'small' | 'medium' | 'large' | { width: number; height?: number };
  /** Espacio vertical a dejar después del logo (Por defecto: 1) */
  moveDown?: number;
}

export interface SignatureUserData {
  text: string;
  fontSize?: number;
  isBold?: boolean;
  color?: string;
}

export interface SignatureMetadataItem {
  label: string;
  value: string;
}

export interface SingleSignature {
  /** Imagen de la firma (Buffer o Path/URL) */
  source: string | Buffer;
  /** Datos de la persona (Nombre, Cargo, Cédula, etc.) */
  userData: SignatureUserData[];
  /** Opcional: Datos de auditoría (IP, Fecha, etc.) que salen al lado de la firma */
  metadata?: SignatureMetadataItem[];
  /** Opciones de tamaño de la imagen de la firma (Por defecto: width 90, height 40) */
  imageSize?: { width: number; height: number };
}

export interface SignatureSectionOptions {
  /** Disposición de los bloques de firma: uno al lado del otro o uno debajo del otro */
  layout?: 'inline' | 'stacked';
  /** Espaciado vertical antes de la sección de firmas (Por defecto: 1) */
  spaceBefore?: number;
  /** Espaciado vertical después de la sección de firmas (Por defecto: 1) */
  spaceAfter?: number;
  /** Color de la línea de firma (Por defecto: Gris suave) */
  lineColor?: string;
  /** Formato para las etiquetas de los metadatos de auditoría */
  metadataOptions?: {
    labelBold?: boolean;
    fontSize?: number;
    labelColor?: string;
    valueColor?: string;
  };
}
