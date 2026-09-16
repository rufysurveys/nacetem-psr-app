const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelDir = 'C:\\Users\\NACETEM060\\Desktop\\PSR';
const outputPath = path.join(__dirname, 'src', 'data', 'excelQuestions.json');

function mapRowToQuestion(row, idx, file) {
  const sectionStr = String(row['Section'] || 'General Public Service Rules');
  const ruleRaw = String(row['Rule'] || '');
  
  // Format Rule Number e.g. 20601 -> PSR 020601, or 30501 -> PSR 030501
  let ruleNumber = 'PSR Regulation';
  if (ruleRaw && ruleRaw !== 'undefined') {
    const cleanNum = ruleRaw.padStart(6, '0');
    ruleNumber = `PSR ${cleanNum}`;
  }

  // Chapter mapping
  let chapter = 'Chapter 2: Appointments & Career Progression';
  if (sectionStr.includes('Chapter 1')) chapter = 'Chapter 1: Structure & Appointments';
  else if (sectionStr.includes('Chapter 2')) chapter = 'Chapter 2: Appointments & Career Progression';
  else if (sectionStr.includes('Chapter 3')) chapter = 'Chapter 3: Discipline & Due Process';
  else if (sectionStr.includes('Chapter 5')) chapter = 'Chapter 5: Performance Management';
  else if (sectionStr.includes('Chapter 11')) chapter = 'Chapter 11: Leave & Allowances';
  else if (sectionStr.includes('Chapter 12')) chapter = 'Chapter 12: Petitions & Appeals';
  else if (sectionStr.includes('Chapter 13')) chapter = 'Chapter 13: Procurement & Public Ethics';

  const title = String(row['Question'] || 'Public Service Rule Question');

  const optionA = String(row['Option A'] || 'Option A');
  const optionB = String(row['Option B'] || 'Option B');
  const optionC = String(row['Option C'] || 'Option C');
  const optionD = String(row['Option D'] || 'Option D');

  const options = [optionA, optionB, optionC, optionD];

  // Correct option mapping ('A' -> 0, 'B' -> 1, 'C' -> 2, 'D' -> 3)
  const correctOptStr = String(row['Correct Option'] || 'A').trim().toUpperCase();
  let correctAnswer = 0;
  if (correctOptStr.includes('B') || correctOptStr === '2') correctAnswer = 1;
  else if (correctOptStr.includes('C') || correctOptStr === '3') correctAnswer = 2;
  else if (correctOptStr.includes('D') || correctOptStr === '4') correctAnswer = 3;

  const feedback = String(row['Google Quiz Feedback'] || `According to ${ruleNumber}, ${row['Correct Answer'] || ''}`);
  
  const questionType = title.toLowerCase().includes('scenario') || title.toLowerCase().includes('what should') || feedback.length > 200
    ? 'sjt' 
    : 'single';

  return {
    id: `excel-q-${idx + 1}`,
    chapter,
    type: questionType,
    title,
    options,
    correctAnswer,
    explanation: feedback,
    psrCitation: {
      ruleNumber,
      sectionTitle: sectionStr,
      excerpt: feedback.replace('Correct. ', '').replace('Under ', 'According to ')
    },
    weightage: questionType === 'sjt' ? 25 : 15,
    difficulty: questionType === 'sjt' ? 'Advanced' : 'Intermediate',
    timeLimitSeconds: questionType === 'sjt' ? 30 : 15
  };
}

function processAllExcelFiles() {
  const files = fs.readdirSync(excelDir).filter(f => f.endsWith('.xlsx'));
  console.log(`Processing ${files.length} Excel files from ${excelDir}...`);

  let allQuestions = [];
  let globalCount = 0;

  files.forEach((file) => {
    const filePath = path.join(excelDir, file);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet);

    json.forEach((row) => {
      if (row['Question'] && row['Option A']) {
        globalCount++;
        const qObj = mapRowToQuestion(row, globalCount, file);
        allQuestions.push(qObj);
      }
    });
  });

  console.log(`Successfully parsed ${allQuestions.length} official questions!`);
  fs.writeFileSync(outputPath, JSON.stringify(allQuestions, null, 2), 'utf-8');
  console.log(`Written official question dataset to ${outputPath}`);
}

processAllExcelFiles();
