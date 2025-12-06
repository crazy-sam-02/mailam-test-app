const { extractQuestionsFromTextGemini } = require('../src/services/ai');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runVerification() {
    console.log('Starting verification...');

    const sampleText = `
    Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods with the aid of chlorophyll. 
    Photosynthesis in plants generally involves the green pigment chlorophyll and generates oxygen as a byproduct.
    The process takes place in the chloroplasts.
    The equation for photosynthesis is: 6CO2 + 6H2O + light energy -> C6H12O6 + 6O2.
  `;

    try {
        console.log('\n--- Testing Medium Multiple Choice ---');
        const q1 = await extractQuestionsFromTextGemini(sampleText, 'Medium', 'Multiple Choice');
        console.log('Count:', q1.length);
        console.log('Sample:', JSON.stringify(q1[0], null, 2));

        console.log('\n--- Testing Hard True/False ---');
        const q2 = await extractQuestionsFromTextGemini(sampleText, 'Hard', 'True/False');
        console.log('Count:', q2.length);
        console.log('Sample:', JSON.stringify(q2[0], null, 2));

        console.log('\n--- Testing Easy Short Answer ---');
        const q3 = await extractQuestionsFromTextGemini(sampleText, 'Easy', 'Short Answer');
        console.log('Count:', q3.length);
        console.log('Sample:', JSON.stringify(q3[0], null, 2));

        console.log('\nVerification Complete!');
    } catch (err) {
        console.error('Verification Failed!');
        console.error(err);
        if (err.message && err.message.includes('Gemini generateContent failed')) {
            console.log('API Key present:', !!process.env.GOOGLE_API_KEY || !!process.env.GEMINI_API_KEY);
        }
    }
}

runVerification();
