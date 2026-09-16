const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelDir = 'C:\\Users\\NACETEM060\\Desktop\\PSR';

function inspectExcelFiles() {
  const files = fs.readdirSync(excelDir).filter(f => f.endsWith('.xlsx'));
  console.log(`Found ${files.length} Excel files in ${excelDir}\n`);

  let totalQuestionsCount = 0;
  const sampleMap = {};

  files.forEach((file, idx) => {
    const filePath = path.join(excelDir, file);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet);

    totalQuestionsCount += json.length;
    console.log(`--- File ${idx + 1}/${files.length}: ${file} ---`);
    console.log(`Sheet: ${sheetName} | Rows: ${json.length}`);
    if (json.length > 0) {
      const cols = Object.keys(json[0]);
      console.log('Columns:', cols);
      console.log('Sample Row:', json[0]);
    }
    console.log('');
  });

  console.log(`\n========================================`);
  console.log(`TOTAL QUESTIONS ACROSS ALL FILES: ${totalQuestionsCount}`);
  console.log(`========================================\n`);
}

inspectExcelFiles();
