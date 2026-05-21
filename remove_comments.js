const fs = require('fs');
const path = require('path');
const stripComments = require('strip-comments');

const directoriesToProcess = [
  'controllers',
  'middleware',
  'models',
  'routes',
  'utils',
  'config'
];

function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // Remove comments using strip-comments
            let stripped = stripComments(content);
            
            // Remove empty lines created by comment removal
            // This regex removes lines that only contain whitespace,
            // but we must be careful not to remove all intentional blank lines.
            // strip-comments leaves the newlines from the comments behind.
            stripped = stripped.replace(/^[ \t]*\n/gm, '');

            fs.writeFileSync(fullPath, stripped);
        }
    }
}

// Process the main directories
for (const dir of directoriesToProcess) {
    processDirectory(path.join(__dirname, dir));
}

// Process server.js
const serverJsPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverJsPath)) {
    let content = fs.readFileSync(serverJsPath, 'utf8');
    let stripped = stripComments(content);
    stripped = stripped.replace(/^[ \t]*\n/gm, '');
    fs.writeFileSync(serverJsPath, stripped);
}

console.log('Comments removed from backend files successfully!');
