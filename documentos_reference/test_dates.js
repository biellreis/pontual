import { readFile } from 'fs/promises';
import * as xlsx from 'xlsx';

async function run() {
  const buf = await readFile('ponto diário relatório.xlsx');
  const workbook = xlsx.read(buf, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
  
  const datas = new Set();
  const nomes = new Set();
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 5) continue;
    const nome = String(row[1] || '').trim();
    if (!nome || nome.includes('Empresa:') || nome.includes('NOME')) continue;
    
    nomes.add(nome);
    
    // tentar extrair data
    const d1 = String(row[2] || '').trim();
    if (d1.match(/^\d{2}\/\d{2}\/\d{4}$/)) datas.add(d1);
    const d2 = String(row[3] || '').trim();
    if (d2.match(/^\d{2}\/\d{2}\/\d{4}$/)) datas.add(d2);
  }
  
  const arr = Array.from(datas);
  arr.sort();
  console.log("Min date:", arr[0]);
  console.log("Max date:", arr[arr.length - 1]);
  console.log("Total dates:", arr.length);
  console.log("Total nomes:", nomes.size);
}
run();
