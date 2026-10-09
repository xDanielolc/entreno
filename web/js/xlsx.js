// Un Excel (.xlsx) de verdad, con colores, bordes y una pestaña por hoja, sin
// librerías: un .xlsx es un zip de unos pocos archivos de texto (XML). El zip
// va sin comprimir («store»), que es válido y basta para hojas pequeñas.
//
// Uso: xlsx([{ nombre, columnas: [anchos], filas: [[celda…]], uniones: ['A1:C1'] }], estilos)
// Cada celda: null, un número, un texto o { v, e } (valor y número de estilo).
// `estilos` es la lista de estilos: { negrita, color (texto), fondo, centro,
// borde, ajustar, tamano }; el 0 es el normal.

const enc = new TextEncoder();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function columna(n) {
  let s = '';
  for (let x = n + 1; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
}

function hojaXml({ columnas = [], filas = [], uniones = [] }) {
  const cols = columnas.length
    ? `<cols>${columnas.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const rows = filas.map((fila, r) => `<row r="${r + 1}">${fila.map((celda, c) => {
    if (celda == null || celda === '') return '';
    const { v, e = 0 } = typeof celda === 'object' ? celda : { v: celda };
    const ref = `${columna(c)}${r + 1}`;
    if (v == null || v === '') return e ? `<c r="${ref}" s="${e}"/>` : '';
    if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}" s="${e}"><v>${v}</v></c>`;
    return `<c r="${ref}" s="${e}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  }).join('')}</row>`).join('');
  const merges = uniones.length ? `<mergeCells count="${uniones.length}">${uniones.map((u) => `<mergeCell ref="${u}"/>`).join('')}</mergeCells>` : '';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + `${cols}<sheetData>${rows}</sheetData>${merges}</worksheet>`;
}

function estilosXml(estilos) {
  const fuentes = [];
  const fondos = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  const xfs = estilos.map((x) => {
    fuentes.push(`<font>${x.negrita ? '<b/>' : ''}<sz val="${x.tamano ?? 11}"/><color rgb="FF${x.color ?? '000000'}"/><name val="Calibri"/></font>`);
    let fill = 0;
    if (x.fondo) { fondos.push(`<fill><patternFill patternType="solid"><fgColor rgb="FF${x.fondo}"/><bgColor indexed="64"/></patternFill></fill>`); fill = fondos.length - 1; }
    const alin = x.centro || x.ajustar
      ? `<alignment${x.centro ? ' horizontal="center"' : ''} vertical="center"${x.ajustar ? ' wrapText="1"' : ''}/>` : '';
    return `<xf numFmtId="0" fontId="${fuentes.length - 1}" fillId="${fill}" borderId="${x.borde ? 1 : 0}" xfId="0"`
      + ` applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${alin}</xf>`;
  });
  const borde = '<border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right>'
    + '<top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + `<fonts count="${fuentes.length}">${fuentes.join('')}</fonts>`
    + `<fills count="${fondos.length}">${fondos.join('')}</fills>`
    + `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${borde}</borders>`
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>`
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
}

// Nombres de pestaña: como mucho 31 caracteres, sin : \ / ? * [ ] y sin repetir.
function nombresDePestana(hojas) {
  const usados = new Set();
  return hojas.map((x) => {
    const base = String(x.nombre || 'Hoja').replace(/[:\\/?*[\]]/g, ' ').slice(0, 31).trim() || 'Hoja';
    let n = base;
    for (let k = 2; usados.has(n.toLowerCase()); k++) n = `${base.slice(0, 28)} ${k}`;
    usados.add(n.toLowerCase());
    return n;
  });
}

export function xlsx(hojas, estilos) {
  const nombres = nombresDePestana(hojas);
  const archivos = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
      + '</Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '</Relationships>',
    'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + `<sheets>${nombres.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
      + `<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
      + '</Relationships>',
    'xl/styles.xml': estilosXml(estilos),
  };
  hojas.forEach((x, i) => { archivos[`xl/worksheets/sheet${i + 1}.xml`] = hojaXml(x); });
  return zip(archivos);
}

// ---------------------------------------------------------------------------
// Zip sin comprimir
// ---------------------------------------------------------------------------

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(archivos) {
  const partes = [];
  const central = [];
  let desplazamiento = 0;
  for (const [nombre, texto] of Object.entries(archivos)) {
    const datos = enc.encode(texto);
    const nom = enc.encode(nombre);
    const crc = crc32(datos);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);          // nombres en UTF-8
    local.setUint16(8, 0, true);               // sin comprimir
    local.setUint32(14, crc, true);
    local.setUint32(18, datos.length, true);
    local.setUint32(22, datos.length, true);
    local.setUint16(26, nom.length, true);
    partes.push(new Uint8Array(local.buffer), nom, datos);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, datos.length, true);
    cen.setUint32(24, datos.length, true);
    cen.setUint16(28, nom.length, true);
    cen.setUint32(42, desplazamiento, true);
    central.push(new Uint8Array(cen.buffer), nom);
    desplazamiento += 30 + nom.length + datos.length;
  }
  const tamCentral = central.reduce((t, x) => t + x.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, Object.keys(archivos).length, true);
  fin.setUint16(10, Object.keys(archivos).length, true);
  fin.setUint32(12, tamCentral, true);
  fin.setUint32(16, desplazamiento, true);
  const todo = [...partes, ...central, new Uint8Array(fin.buffer)];
  const salida = new Uint8Array(todo.reduce((t, x) => t + x.length, 0));
  let p = 0;
  for (const x of todo) { salida.set(x, p); p += x.length; }
  return salida;
}
