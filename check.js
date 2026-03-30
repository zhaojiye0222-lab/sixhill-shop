const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /<(\/?)(div|main|header|nav)[^>]*>/gi;
let match;
const stack = [];

while ((match = regex.exec(html)) !== null) {
  const isClosing = match[1] === '/';
  const tagStr = match[0];
  const tagType = match[2].toLowerCase();
  const lineNum = html.substring(0, match.index).split('\n').length;
  
  if (!isClosing) {
    stack.push({ lineNum, tagType, tagStr });
  } else {
    if (stack.length === 0) {
      console.log('EXTRA CLOSING ' + tagType + ' at line:', lineNum);
    } else {
      const top = stack.pop();
      if (top.tagStr.includes('id="app"')) console.log('app closed at', lineNum);
      if (top.tagStr.includes("activeTab === 'home'")) console.log('home closed at', lineNum);
      if (top.tagStr.includes("activeTab === 'category'")) console.log('category closed at', lineNum);
      if (top.tagStr.includes("activeTab === 'cart'")) console.log('cart closed at', lineNum);
      if (top.tagStr.includes("activeTab === 'profile'")) console.log('profile closed at', lineNum);
    }
  }
}
if (stack.length > 0) {
  console.log('UNCLOSED TAGS:', stack.map(s => s.tagType + ' on line ' + s.lineNum).join(', '));
}
