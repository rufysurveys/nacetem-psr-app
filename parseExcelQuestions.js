import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const excelDir = 'C:\\Users\\NACETEM060\\Desktop\\PSR';

function inspectExcelFiles() {
  const files = fs.readdirSync(excelDir).filter(f => f.endsWith('.xlsx'));
  console.log(`Found ${files.length} Excel files in ${excelDir}\n`);

  files.forEach((file, idx) => {
    const filePath = path.join(excelDir, file);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet);

    console.log(`--- File ${idx + 1}/${files.length}: ${file} ---`);
    console.log(`Sheet Name: ${sheetName}`);
    console.log(`Total Rows: ${json.length}`);
    if (json.length > 0) {
      console.log('Columns:', Object.keys(json[0]));
      console.log('Sample Row 1:', json[0]);
    }
    console.log('\n');
  });
}

inspectExcelFiles();
