const fs = require('fs');
const https = require('https');
const path = require('path');

const targetDir = path.join(__dirname, 'apps', 'landing', 'public', 'textures', 'planets');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const baseUrl = 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/';
const files = [
  'moonmap1k.jpg',
  'moonbump1k.jpg',
  'marsmap1k.jpg',
  'marsbump1k.jpg',
  'jupitermap.jpg',
  'saturnmap.jpg',
  'saturnringcolor.jpg',
  'saturnringpattern.gif',
  'venusmap.jpg',
  'venusbump.jpg'
];

async function downloadFile(filename) {
  const fileUrl = baseUrl + filename;
  const filePath = path.join(targetDir, filename);
  
  return new Promise((resolve, reject) => {
    https.get(fileUrl, (res) => {
      if (res.statusCode === 200) {
        const fileStream = fs.createWriteStream(filePath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          console.log('Downloaded ' + filename);
          resolve();
        });
      } else {
        console.error('Failed to download ' + filename + ': ' + res.statusCode);
        resolve(); // resolve anyway to continue
      }
    }).on('error', (err) => {
      console.error('Error downloading ' + filename + ':', err.message);
      resolve();
    });
  });
}

async function run() {
  for (const file of files) {
    await downloadFile(file);
  }
  console.log('Done!');
}

run();
