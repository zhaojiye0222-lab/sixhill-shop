const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const lines = html.split('\n');
let openCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // count <div ...>
  let openMatches = line.match(/<div(?=[\s>])/g);
  if (openMatches) openCount += openMatches.length;
  
  // count </div>
  let closeMatches = line.match(/<\/div>/g);
  if (closeMatches) openCount -= closeMatches.length;
  
  // if (openCount < 0) console.log(`Extra closing div at line ${i+1}`);
}
console.log('Final open div count:', openCount);

// Let's trace it backwards or forwards to find the mismatch
let stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let p = 0;
  while (p < line.length) {
    const openIdx = line.indexOf('<div', p);
    const closeIdx = line.indexOf('</div', p);
    
    if (openIdx !== -1 && (closeIdx === -1 || openIdx < closeIdx)) {
      stack.push(i + 1);
      p = openIdx + 4;
    } else if (closeIdx !== -1) {
      if (stack.length > 0) stack.pop();
      else console.log(`Extra closing div at line ${i+1}`);
      p = closeIdx + 5;
    } else {
      break;
    }
  }
}
console.log('Unclosed divs opened at lines:', stack);
