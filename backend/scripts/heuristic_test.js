const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'profit and loss.docx');
const text = fs.readFileSync(filePath, 'utf8');

function extractQuestionsFromText(text) {
  const questions = [];
  if (!text || typeof text !== 'string') return questions;

  const blocks = text.split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean);

  for (const block of blocks) {
    const lines = block.split(/\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    let qText = lines[0].replace(/^\d+\.|^Q[:.)]?\s*/i, '').trim();

    const opts = [];
    for (let i = 1; i < lines.length && opts.length < 8; i++) {
      let l = lines[i];
      l = l.replace(/^[A-Da-d]\)|^[A-Da-d]\.\s*|^\d+\)\s*|^-\s*|^\u2022\s*/,'').trim();
      if (!l) continue;
      if (/^answer[:\s]/i.test(l) || /^solution[:\s]/i.test(l)) continue;
      if ((l.match(/\t/g) || []).length >= 1) {
        l.split(/\t+/).forEach(p => p.trim() && opts.push(p.trim()));
      } else {
        opts.push(l);
      }
    }

    let correctIndex = null;
    const ansMatch = block.match(/answer[:\)\s]*\s*([A-Da-d1-4])/i);
    if (ansMatch) {
      const a = ansMatch[1].toUpperCase();
      if (/[A-D]/.test(a)) correctIndex = a.charCodeAt(0) - 'A'.charCodeAt(0);
      else if (/[1-4]/.test(a)) correctIndex = parseInt(a, 10) - 1;
    }

    if (correctIndex === null) {
      for (let i = 0; i < opts.length; i++) {
        if (/\(correct\)|\*\s*$|\[correct\]/i.test(opts[i])) {
          correctIndex = i;
          opts[i] = opts[i].replace(/\(correct\)|\[correct\]|\*\s*$/i, '').trim();
          break;
        }
      }
    }

    if (opts.length >= 2) {
      const normalized = opts.slice(0, 4);
      while (normalized.length < 4) normalized.push('Option');
      if (correctIndex === null || correctIndex < 0 || correctIndex >= normalized.length) correctIndex = 0;
      questions.push({ text: qText, options: normalized, correctOptionIndex: correctIndex });
    }
  }

  return questions;
}

const extracted = extractQuestionsFromText(text);
console.log('Blocks length estimation and sample text length:', text.length);
console.log('Extracted questions count:', extracted.length);
console.log(JSON.stringify(extracted, null, 2));
