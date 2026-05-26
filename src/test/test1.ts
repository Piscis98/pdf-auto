import { PDFAuto } from '../core/pdf-auto';

async function runBufferTest() {
  console.log('Ejecutando Test 1: Retorno como Buffer Raw...');
  
  const pdf = new PDFAuto({ colors: { primary: '#4f46e5' } });
  pdf.addHeading('Reporte Volátil en Memoria')
     .addText('Este documento se compila directamente en un array binario en la memoria RAM del servidor.');

  await pdf.addTable({
    headers: ['Métrica', 'Valor'],
    rows: [['Uso de CPU', '14%'], ['Asignación RAM', '45MB']]
  });

  const bufferFinal = await pdf.toBuffer();
  console.log(`\x1b[32m¡Éxito! El Buffer se generó correctamente (${bufferFinal.length} bytes).\x1b[0m`);
}

runBufferTest();