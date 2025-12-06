const fs = require('fs');
const path = require('path');
const https = require('https');

const models = [
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
const targetDir = path.join(__dirname, '../public/models');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

const download = (file) => {
    const url = `${baseUrl}/${file}`;
    const filePath = path.join(targetDir, file);
    const fileStream = fs.createWriteStream(filePath);

    https.get(url, (response) => {
        response.pipe(fileStream);
        fileStream.on('finish', () => {
            fileStream.close();
            console.log(`Downloaded ${file}`);
        });
    }).on('error', (err) => {
        fs.unlink(filePath, () => { }); // Delete the file async. (But we don't check the result)
        console.error(`Error downloading ${file}: ${err.message}`);
    });
};

models.forEach(download);
