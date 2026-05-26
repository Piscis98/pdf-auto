import PDFDocument from 'pdfkit-table';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { PassThrough } from 'stream';
import { PDFAutoOptions, PDFAutoTableData, ImageOptions, GridCell, GridRowOptions, ColumnItem, ColumnRowOptions, LogoOptions, SingleSignature, SignatureSectionOptions } from '../interfaces';
import { IStorageProvider } from '../interfaces/storage.interface';

export interface ExtendedImageOptions extends ImageOptions {
  x?: number;
  y?: number;
}

export class PDFAuto {
  private doc: any;
  private config: Required<Omit<PDFAutoOptions, 'colors'>> & { colors: Required<import('../interfaces').PDFAutoColors> };
  // Caché volátil por instancia para evitar descargas HTTP y lecturas de disco duplicadas
  private imageCache: Map<string, Buffer> = new Map();

  constructor(options: PDFAutoOptions = {}) {
    this.config = {
      size: options.size || 'A4',
      layout: options.layout || 'portrait',
      margin: options.margin || 40,
      colors: {
        primary: options.colors?.primary || '#1E3A8A',
        secondary: options.colors?.secondary || '#4B5563',
        text: options.colors?.text || '#1F2937',
        light: options.colors?.light || '#F3F4F6'
      },
      fonts: options.fonts || { body: 'Helvetica', bold: 'Helvetica-Bold' }
    };

    this.doc = new PDFDocument({ size: this.config.size, margin: this.config.margin, autoFirstPage: false, layout: this.config.layout });
    this.addPage();
  }

  /**
   * Helper optimizado para descargar archivos binarios de forma eficiente
   */
  private fetchImageBuffer(url: string): Promise<Buffer> {
    if (this.imageCache.has(url)) {
      return Promise.resolve(this.imageCache.get(url)!);
    }

    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        if (res.statusCode !== 200) return reject(new Error(`Status: ${res.statusCode}`));
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          this.imageCache.set(url, buffer); // Guardar en caché interna
          resolve(buffer);
        });
        res.on('error', (err) => reject(err));
      }).on('error', (err) => reject(err));
    });
  }

  /**
   * Procesa la entrada y retorna EXCLUSIVAMENTE un Buffer binario (Evita strings pesados Base64)
   */
  private async processToBuffer(source: string | Buffer): Promise<Buffer | null> {
    if (Buffer.isBuffer(source)) return source;

    if (typeof source === 'string') {
      const cacheKey = source;
      if (this.imageCache.has(cacheKey)) {
        return this.imageCache.get(cacheKey)!;
      }

      if (source.startsWith('http://') || source.startsWith('https://')) {
        try {
          return await this.fetchImageBuffer(source);
        } catch (e) {
          console.error(`[pdf-auto] Error descargando imagen remota: ${source}`);
          return null;
        }
      }
      
      if (fs.existsSync(source)) {
        try {
          const buffer = fs.readFileSync(source);
          this.imageCache.set(cacheKey, buffer);
          return buffer;
        } catch (e) {
          console.error(`[pdf-auto] Error leyendo archivo local: ${source}`);
          return null;
        }
      }
    }

    return null;
  }

  public addPage(): this {
    this.doc.addPage();
    this.doc.font(this.config.fonts.body).fontSize(11).fillColor(this.config.colors.text);
    return this;
  }

  public addHeading(
    text: string, 
    options?: { 
      fontSize?: number; 
      color?: string; 
      align?: 'left' | 'center' | 'right' | 'justify';
      moveDown?: number;
    }
  ): this {
    // Definir los estilos finales basándose en las opciones o cayendo en el config global
    const fontSize = options?.fontSize || 20;
    const color = options?.color || this.config.colors.primary;
    const alignment = options?.align || 'left';
    const spaceAfter = options?.moveDown !== undefined ? options.moveDown : 0.5;

    // Guardamos el estado del lienzo para aislar los estilos de esta llamada
    this.doc.save();

    this.doc
      .font(this.config.fonts.bold)
      .fontSize(fontSize)
      .fillColor(color);

    this.doc.text(text, {
      align: alignment
    });

    if (spaceAfter > 0) {
      this.doc.moveDown(spaceAfter);
    }

    // Restauramos el estado del pincel original de PDFKit
    this.doc.restore();

    return this;
  }

  public addText(
    text: string, 
    options?: { 
      fontSize?: number; 
      color?: string; 
      isBold?: boolean; 
      align?: 'left' | 'center' | 'right' | 'justify';
      moveDown?: number;
    }
  ): this {
    // 1. Definir los estilos finales: Usa lo que viene en options o cae en el global
    const font = options?.isBold ? this.config.fonts.bold : this.config.fonts.body;
    const fontSize = options?.fontSize || 11;
    const color = options?.color || this.config.colors.text;
    const alignment = options?.align || 'left';
    const spaceAfter = options?.moveDown !== undefined ? options.moveDown : 0.4;

    // Guardamos el estado para no alterar el pincel global de PDFKit de forma permanente
    this.doc.save();

    this.doc.font(font).fontSize(fontSize).fillColor(color);

    for (const line of text.split('<br>')) {
      this.doc.text(line, {
        align: alignment
      });
      
      if (spaceAfter > 0) {
        this.doc.moveDown(spaceAfter);
      }
    }

    // Restauramos el pincel al estado original
    this.doc.restore();
    
    return this;
  }

  public async addImage(source: string | Buffer, options: ExtendedImageOptions = {}): Promise<this> {
    try {
      const imgBuffer = await this.processToBuffer(source);
      if (!imgBuffer) return this;

      const width = options.width || 120;
      
      if (options.x !== undefined && options.y !== undefined) {
        this.doc.image(imgBuffer, options.x, options.y, { width, height: options.height });
        return this;
      }

      let x = this.config.margin;
      if (options.align === 'center') {
        x = (this.doc.page.width - width) / 2;
      } else if (options.align === 'right') {
        x = this.doc.page.width - this.config.margin - width;
      }

      this.doc.image(imgBuffer, x, this.doc.y, { width, height: options.height });
      this.doc.moveDown(0.5); 
    } catch (error: any) {
      console.error(`[pdf-auto] Error addImage: ${error.message}`);
    }
    return this;
  }

  /**
   * CONSTRUCCIÓN DE TABLAS AUTOMÁTICAS - VERSIÓN ULTRA-EFICIENTE (LOW-MEMORY)
   */
  public async addTable(tableData: PDFAutoTableData): Promise<this> {
    // 1. Procesamiento de filas con resolución controlada y extracción de meta-datos de imágenes
    const processedRows: (any)[][] = [];
    // Mapeo en paralelo para recordar las dimensiones customizadas de la imagen por cada coordenada [row][col]
    const imageSpecsMap: Record<string, { width?: number; height?: number }> = {};
    
    for (let rowIndex = 0; rowIndex < tableData.rows.length; rowIndex++) {
      const row = tableData.rows[rowIndex];
      const processedRow = [];
      
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cell = row[colIndex];
        
        // Detectar si la celda es un objeto de configuración extendida para la imagen
        const isImageObj = cell && typeof cell === 'object' && !Buffer.isBuffer(cell) && ('source' in cell);
        const sourceMaterial = isImageObj ? (cell as any).source : cell;

        if (Buffer.isBuffer(sourceMaterial) || (typeof sourceMaterial === 'string' && (sourceMaterial.startsWith('http') || fs.existsSync(sourceMaterial)))) {
          const res = await this.processToBuffer(sourceMaterial);
          processedRow.push(res); // Guardamos el Buffer puro
          
          // Guardamos las dimensiones custom si es que venían en el objeto
          if (isImageObj) {
            imageSpecsMap[`${rowIndex}_${colIndex}`] = {
              width: (cell as any).width,
              height: (cell as any).height
            };
          }
        } else {
          processedRow.push(cell);
        }
      }
      processedRows.push(processedRow);
    }

    // =======================================================================
    // 2. Mapear cabeceras y calcular distribución inteligente con PORCENTAJES
    // =======================================================================
    const totalPageWidth = this.doc.page.width - (this.config.margin * 2);
    
    const initialHeaders = tableData.headers.map((h, colIndex) => {
      const propertyName = `col_${colIndex}`;
      const headerObj = typeof h === 'string' 
        ? { label: h, property: propertyName, width: 0 as any } 
        : { ...h, property: h.property || propertyName, width: h.width || 0 };

      const rawWidth = headerObj.width as any;

      if (typeof rawWidth === 'string' && rawWidth.includes('%')) {
        const percent = parseFloat(rawWidth.replace('%', ''));
        headerObj.width = (totalPageWidth * percent) / 100;
      } 
      else if (typeof rawWidth === 'number' && rawWidth > 0 && rawWidth <= 100) {
        headerObj.width = (totalPageWidth * rawWidth) / 100;
      }

      return headerObj;
    });

    const columnsWithoutWidth = initialHeaders.filter(h => !h.width).length;
    const allocatedWidth = initialHeaders.reduce((sum, h) => sum + (h.width || 0), 0);
    const remainingWidth = totalPageWidth - allocatedWidth;
    const autoColumnWidth = columnsWithoutWidth > 0 ? Math.max(remainingWidth / columnsWithoutWidth, 50) : 100;

    const headersFormatted = initialHeaders.map((headerObj, colIndex) => {
      const isImageColumn = processedRows.some(row => Buffer.isBuffer(row[colIndex]));
      
      if (!headerObj.width) {
        if (isImageColumn) {
          headerObj.width = 60; 
        } else {
          headerObj.width = autoColumnWidth;
        }
      }
      
      return headerObj;
    });

    // 3. Crear las celdas pasando un espacio en blanco en lugar de un vacío absoluto
    const datasFormatted = processedRows.map(row => {
      let obj: Record<string, any> = {};
      headersFormatted.forEach((header, index) => {
        const value = row[index];
        obj[header.property] = Buffer.isBuffer(value) ? " " : (value !== undefined ? value : " ");
      });
      return obj;
    });

    // 4. Configuración unificada optimizando la interceptación del lienzo
    const tableConfig = {
      headers: headersFormatted,
      datas: datasFormatted,
      options: {
        prepareHeader: () => this.doc.font(this.config.fonts.bold).fontSize(10).fillColor(this.config.colors.primary),
        
        prepareRow: (row: any, indexColumn: number, indexRow: number, rectRow: any, rectCell: any) => {
          this.doc.font(this.config.fonts.body).fontSize(10).fillColor(this.config.colors.text);

          const cellValue = processedRows[indexRow]?.[indexColumn];
          
          // CORRECCIÓN AQUÍ: Validamos que rectCell exista y tenga coordenadas reales (> 0)
          // Esto evita que las pasadas de medición de la librería pinten la imagen en la esquina (0,0)
          if (Buffer.isBuffer(cellValue) && rectCell && rectCell.x > 0 && rectCell.y > 0) {
            // Buscamos si esta celda específica tiene dimensiones personalizadas asignadas
            const customSpecs = imageSpecsMap[`${indexRow}_${indexColumn}`];
            
            const imgWidth = customSpecs?.width || 20;
            const imgHeight = customSpecs?.height || imgWidth;
            
            // Centrado matemático exacto
            const x = rectCell.x + (rectCell.width - imgWidth) / 2;
            const y = rectCell.y + (rectCell.height - imgHeight) / 2;
            
            try {
              this.doc.image(cellValue, x, y, { width: imgWidth, height: imgHeight });
            } catch (e) {
              console.error("Error inyectando Buffer dinámico en celda:", e);
            }
          }
        },
        ...tableData.options
      }
    };

    await this.doc.table(tableConfig);
    
    this.doc.font(this.config.fonts.body).fontSize(11).fillColor(this.config.colors.text);
    this.doc.moveDown(1);
    
    this.imageCache.clear();
    return this;
  }

  /**
   * CONSTRUCCIÓN DE FILAS EN GRID (RECTÁNGULOS DINÁMICOS)
   * Permite crear líneas divididas en porcentajes con fondos, imágenes y textos combinados.
   */
  public async addGridRow(cells: GridCell[], options: GridRowOptions): Promise<this> {
    const startX = this.config.margin;
    const startY = this.doc.y;
    const totalWidth = this.doc.page.width - (this.config.margin * 2);
    const rowHeight = options.height;

    // Verificar si la fila cabe en la página actual, si no, crear una nueva
    if (startY + rowHeight > this.doc.page.height - this.config.margin) {
      this.addPage();
    }

    let currentX = startX;
    const currentY = this.doc.y;

    for (const cell of cells) {
      // 1. Calcular el ancho real en píxeles basado en el porcentaje provisto
      const cellWidth = (totalWidth * cell.widthPercent) / 100;

      // 2. Dibujar el fondo del rectángulo si se especifica un color
      if (cell.backgroundColor) {
        this.doc.rect(currentX, currentY, cellWidth, rowHeight)
          .fill(cell.backgroundColor);
      }

      // 3. Dibujar borde sutil para delimitar la estructura tipo ficha
      this.doc.rect(currentX, currentY, cellWidth, rowHeight)
        .lineWidth(0.5)
        .stroke(this.config.colors.secondary);

      // 4. Renderizar imagen si existe dentro del bloque
      if (cell.image) {
        const imgBuffer = await this.processToBuffer(cell.image);
        if (imgBuffer) {
          const imgSize = rowHeight * 0.6; // La imagen ocupará el 60% del alto del bloque
          const imgX = currentX + (cellWidth - imgSize) / 2;
          const imgY = currentY + (rowHeight - imgSize) / 2;
          
          try {
            this.doc.image(imgBuffer, imgX, imgY, { width: imgSize, height: imgSize });
          } catch (e) {
            console.error("[pdf-auto] Error al pintar imagen en Grid:", e);
          }
        }
      }

      // 5. Renderizar texto si existe dentro del bloque
      if (cell.text) {
        // Guardar estado del lienzo para no alterar otras celdas
        this.doc.save();

        const font = cell.isBold ? this.config.fonts.bold : this.config.fonts.body;
        const fontSize = cell.fontSize || 9;
        const textColor = cell.textColor || (cell.backgroundColor ? '#FFFFFF' : this.config.colors.text);
        const textAlignment = cell.align || 'left';

        this.doc.font(font).fontSize(fontSize).fillColor(textColor);

        // Calcular padding interno para centrar verticalmente el texto en el rectángulo
        const textHeight = this.doc.currentLineHeight();
        const paddingY = (rowHeight - textHeight) / 2;

        // Escribir el texto limitando el contenedor para que respete los márgenes del rectángulo
        this.doc.text(cell.text, currentX + 5, currentY + paddingY, {
          width: cellWidth - 10,
          align: textAlignment,
          lineBreak: false
        });

        this.doc.restore();
      }

      // Desplazar el puntero X hacia la derecha para el siguiente rectángulo
      currentX += cellWidth;
    }

    // =======================================================================
    // CORRECCIÓN AQUÍ: Restablecer el puntero X e Y para los siguientes textos/tablas
    // =======================================================================
    this.doc.x = startX; // Forzamos el regreso al margen izquierdo (Evita el amontonamiento a la derecha)
    this.doc.y = currentY + rowHeight + (options.spaceAfter || 0); // Bajamos el cursor verticalmente
    return this;
  }

  /**
   * AGREGAR TEXTO EN COLUMNAS DINÁMICAS (LADO A LADO)
   * Distribuye automáticamente de 1 a N columnas en el mismo renglón con formato Label: Valor
   */
  public addColumn(
    columns: ColumnItem[], 
    options?: ColumnRowOptions & { layout?: 'inline' | 'stacked' }
  ): this {
    const startX = this.config.margin;
    const startY = this.doc.y;
    const totalWidth = this.doc.page.width - (this.config.margin * 2);
    
    const colCount = columns.length;
    const colWidth = totalWidth / colCount;

    // Estilos base
    const fontSize = options?.fontSize || 10;
    const labelColor = options?.labelColor || this.config.colors.primary;
    const valueColor = options?.valueColor || this.config.colors.text;
    
    const isLabelBold = options?.labelBold !== undefined ? options.labelBold : true;
    const isValueBold = options?.valueBold !== undefined ? options.valueBold : false;
    
    const labelFont = isLabelBold ? this.config.fonts.bold : this.config.fonts.body;
    const valueFont = isValueBold ? this.config.fonts.bold : this.config.fonts.body;
    const spaceAfter = options?.spaceAfter !== undefined ? options.spaceAfter : 0.4;
    
    // Nueva opción de maquetación: 'inline' (por defecto) o 'stacked'
    const layout = options?.layout || 'inline';

    this.doc.save();

    let currentX = startX;
    let maxRowHeight = 0;

    columns.forEach((col) => {
      // Guardamos la altura inicial de esta columna específica para calcular su crecimiento
      this.doc.y = startY;

      if (layout === 'stacked') {
        // ==========================================
        // DISEÑO STACKED: Valor debajo del Label
        // ==========================================
        // 1. Renderizar el Label arriba
        this.doc.font(labelFont).fontSize(fontSize).fillColor(labelColor)
          .text(col.label, currentX, this.doc.y, { width: colWidth - 10 });
        
        // Pequeño espacio de separación vertical interna
        this.doc.moveDown(0.1);

        // 2. Renderizar el Valor abajo en la misma coordenada X
        this.doc.font(valueFont).fontSize(fontSize).fillColor(valueColor)
          .text(col.value, currentX, this.doc.y, { width: colWidth - 10 });

      } else {
        // ==========================================
        // DISEÑO INLINE: Label y Valor en la misma línea
        // ==========================================
        this.doc.font(labelFont).fontSize(fontSize);
        const labelClean = `${col.label}: `;
        const labelWidth = this.doc.widthOfString(labelClean);

        // Renderizar Label seguido por el valor usando 'continued: true'
        this.doc.fillColor(labelColor).text(labelClean, currentX, startY, {
          width: colWidth - 10,
          continued: true
        });

        this.doc.font(valueFont).fillColor(valueColor).text(col.value, {
          width: colWidth - (labelWidth + 10)
        });
      }

      // Medir el alto final de la columna actual para ajustar el renglón global
      const currentColumnHeight = this.doc.y - startY;
      if (currentColumnHeight > maxRowHeight) {
        maxRowHeight = currentColumnHeight;
      }

      // Mover el puntero X horizontalmente para la siguiente columna
      currentX += colWidth;
    });

    this.doc.restore();

    // Reubicamos el cursor general abajo de la columna que haya quedado más alta de todas
    this.doc.x = startX;
    this.doc.y = startY + maxRowHeight;
    
    if (spaceAfter > 0) {
      this.doc.moveDown(spaceAfter);
    }

    return this;
  }

  /**
   * AGREGAR LOGOTIPO AL DOCUMENTO
   * Coloca una imagen de forma óptima soportando tamaños predefinidos/personalizados 
   * y alineación automática o coordenadas manuales exactas.
   */
  public async addLogo(
    source: string | Buffer, 
    options?: LogoOptions
  ): Promise<this> {
    // 1. Procesar la imagen a Buffer (reutilizando tu método interno)
    const imageBuffer = await this.processToBuffer(source);
    if (!imageBuffer) {
      console.error("No se pudo procesar la imagen para el logo.");
      return this;
    }

    // 2. Determinar las dimensiones (Ancho y Alto)
    let imgWidth = 80; // Default: Medium
    let imgHeight: number | undefined = undefined;

    const sizeOpt = options?.size || 'medium';
    if (typeof sizeOpt === 'string') {
      switch (sizeOpt) {
        case 'small':  imgWidth = 45;  break;
        case 'medium': imgWidth = 80;  break;
        case 'large':  imgWidth = 130; break;
      }
    } else {
      imgWidth = sizeOpt.width;
      imgHeight = sizeOpt.height; // PDFKit escala proporcionalmente si height es undefined
    }

    // 3. Determinar la posición X e Y
    const margin = this.config.margin;
    const pageWidth = this.doc.page.width;
    const availableWidth = pageWidth - (margin * 2);
    
    let x = margin;
    // Si no se especifica posición, por defecto asumimos la altura actual del cursor (this.doc.y)
    let y = this.doc.y; 

    const posOpt = options?.position || 'left';

    if (typeof posOpt === 'string') {
      switch (posOpt) {
        case 'left':
          x = margin;
          break;
        case 'center':
          x = margin + (availableWidth - imgWidth) / 2;
          break;
        case 'right':
          x = pageWidth - margin - imgWidth;
          break;
      }
    } else {
      // Coordenadas fijas personalizadas
      x = posOpt.x;
      y = posOpt.y;
    }

    // 4. Renderizar la imagen en el lienzo de PDFKit
    this.doc.save();
    try {
      // Si el usuario no mandó un alto específico, dejamos que PDFKit calcule la proporción nativa
      const imgOptions: any = { width: imgWidth };
      if (imgHeight) imgOptions.height = imgHeight;

      this.doc.image(imageBuffer, x, y, imgOptions);

      // 5. Controlar el flujo del cursor de texto para que lo siguiente que escribas no se pise
      // Solo alteramos el puntero global 'y' si se usó alineación estándar (left, center, right)
      if (typeof posOpt === 'string') {
        // Estimar el alto basándonos en un cuadrado si no viene el alto explícito, 
        // o usar el alto exacto si se conoce.
        const estimatedHeight = imgHeight || imgWidth * 0.6; // Multiplicador promedio para logos rectangulares
        this.doc.y = y + estimatedHeight;
        
        const spaceAfter = options?.moveDown !== undefined ? options.moveDown : 1;
        if (spaceAfter > 0) {
          this.doc.moveDown(spaceAfter);
        }
      }
    } catch (e) {
      console.error("Error al estampar el logotipo con addLogo:", e);
    }
    this.doc.restore();

    return this;
  }

  /**
   * SECCIÓN DE FIRMAS DIGITALES / MANUCRITAS
   * Renderiza N firmas alineadas horizontal o verticalmente con líneas divisorias y metadatos de auditoría.
   */
  public async addSignatures(
    signatures: SingleSignature[],
    options?: SignatureSectionOptions
  ): Promise<this> {
    const startX = this.config.margin;
    const totalWidth = this.doc.page.width - (this.config.margin * 2);
    
    const layout = options?.layout || 'inline';
    const spaceBefore = options?.spaceBefore !== undefined ? options.spaceBefore : 1;
    const spaceAfter = options?.spaceAfter !== undefined ? options.spaceAfter : 1;
    const lineColor = options?.lineColor || '#D1D5DB';
    
    // Defaults de los metadatos de auditoría
    const metaFontSize = options?.metadataOptions?.fontSize || 7;
    const metaLabelColor = options?.metadataOptions?.labelColor || this.config.colors.primary;
    const metaValueColor = options?.metadataOptions?.valueColor || this.config.colors.text;
    const isMetaLabelBold = options?.metadataOptions?.labelBold !== undefined ? options.metadataOptions?.labelBold : true;

    if (spaceBefore > 0) this.doc.moveDown(spaceBefore);
    
    const startY = this.doc.y;
    this.doc.save();

    // Calcular distribución horizontal según el layout
    const colCount = layout === 'inline' ? signatures.length : 1;
    const colWidth = totalWidth / colCount;

    let currentX = startX;
    let maxSectionHeight = 0;

    for (let i = 0; i < signatures.length; i++) {
      const sig = signatures[i];
      // Si es stacked, cada firma arranca abajo de la anterior; si es inline, comparten el startY
      const sigStartY = layout === 'inline' ? startY : startY + maxSectionHeight;
      this.doc.y = sigStartY;

      // 1. Procesar Buffer de la imagen de la firma
      const sigBuffer = await this.processToBuffer(sig.source);
      const imgW = sig.imageSize?.width || 90;
      const imgH = sig.imageSize?.height || 40;

      // Calcular centro horizontal de la columna para la firma y la línea
      const padding = 15;
      const contentWidth = colWidth - (padding * 2);
      const sigX = currentX + padding + (contentWidth - imgW) / 2;
      
      // Dibujar la imagen de la firma
      if (sigBuffer) {
        try {
          this.doc.image(sigBuffer, sigX, this.doc.y, { width: imgW, height: imgH });
        } catch (e) {
          console.error("Error al renderizar la imagen de la firma:", e);
        }
      }

      // 2. Renderizar Metadatos de Auditoría (Opcionales) al lado derecho de la firma
      if (sig.metadata && sig.metadata.length > 0) {
        // Se posicionan a la derecha de la imagen de la firma dentro de su cuadrante
        const metaX = sigX + imgW + 8; 
        const metaWidth = (currentX + colWidth) - metaX - padding;
        
        // Guardamos el Y actual de la firma para escribir los metadatos flotando al lado
        const savedY = this.doc.y;
        
        sig.metadata.forEach((meta) => {
          this.doc.font(isMetaLabelBold ? this.config.fonts.bold : this.config.fonts.body)
            .fontSize(metaFontSize).fillColor(metaLabelColor);
          
          const labelText = `${meta.label}: `;
          const labelW = this.doc.widthOfString(labelText);

          this.doc.text(labelText, metaX, this.doc.y, { width: metaWidth, continued: true });
          
          this.doc.font(this.config.fonts.body).fillColor(metaValueColor)
            .text(meta.value, { width: metaWidth - labelW });
          
          this.doc.moveDown(0.1);
        });
        
        // Restauramos el Y al flujo normal debajo de la firma
        this.doc.y = savedY;
      }

      // Mover el cursor debajo de la firma para trazar la línea
      this.doc.y = sigStartY + imgH + 5;

      // 3. Dibujar Línea de Firma centradita
      const lineLength = Math.min(180, contentWidth); // Línea estilizada de máximo 180px
      const lineX1 = currentX + padding + (contentWidth - lineLength) / 2;
      const lineX2 = lineX1 + lineLength;

      this.doc.lineWidth(1).strokeColor(lineColor)
        .moveTo(lineX1, this.doc.y)
        .lineTo(lineX2, this.doc.y)
        .stroke();

      this.doc.moveDown(0.4);

      // 4. Renderizar datos del usuario (Nombre, cédula, cargo...)
      sig.userData.forEach((userText) => {
        const uFontSize = userText.fontSize || 9;
        const uFont = userText.isBold ? this.config.fonts.bold : this.config.fonts.body;
        const uColor = userText.color || this.config.colors.text;

        this.doc.font(uFont).fontSize(uFontSize).fillColor(uColor)
          .text(userText.text, currentX + padding, this.doc.y, {
            width: contentWidth,
            align: 'center'
          });
        this.doc.moveDown(0.1);
      });

      // Calcular la altura máxima alcanzada por esta columna
      const totalSigHeight = this.doc.y - startY;
      if (totalSigHeight > maxSectionHeight) {
        maxSectionHeight = totalSigHeight;
      }

      // Si es inline, nos movemos a la derecha para la siguiente firma
      if (layout === 'inline') {
        currentX += colWidth;
      }
    }

    this.doc.restore();
    
    // Posicionar cursor global al final de toda la sección de firmas
    this.doc.x = startX;
    this.doc.y = startY + maxSectionHeight;

    if (spaceAfter > 0) this.doc.moveDown(spaceAfter);

    this.imageCache.clear();
    return this;
  }

  public toBuffer(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      this.doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      this.doc.on('end', () => {
        this.imageCache.clear(); // Limpieza preventiva final
        resolve(Buffer.concat(chunks));
      });
      this.doc.on('error', (err: Error) => reject(err));
      this.doc.end();
    });
  }

  public async toAzure(storageProvider: IStorageProvider, fileName: string): Promise<string> {
    const { stream, promise } = storageProvider.uploadStream(fileName);
    this.doc.pipe(stream);
    this.doc.end();
    this.imageCache.clear(); // Limpieza preventiva final
    return await promise;
  }
}