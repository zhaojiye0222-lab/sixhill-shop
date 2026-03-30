const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /<(\/?)(div)[^>]*>/gi;
let match;
let depth = 0;
const stack = [];

while ((match = regex.exec(html)) !== null) {
  const isClosing = match[1] === '/';
  const tagStr = match[0];
  const lineNum = html.substring(0, match.index).split('\n').length;
  
  if (!isClosing) {
    let id = '';
    if (tagStr.includes('id="app"')) id = 'APP';
    else if (tagStr.includes("activeTab === 'home'")) id = 'HOME';
    else if (tagStr.includes("activeTab === 'category'")) id = 'CAT';
    else if (tagStr.includes("activeTab === 'cart'")) id = 'CART';
    else if (tagStr.includes("activeTab === 'profile'")) id = 'PROF';
    else if (tagStr.includes('class="bg-white rounded-xl shadow-sm p-4"')) id = 'MY_ORDERS';
    else id = 'div';
    
    stack.push({ lineNum, id });
    depth++;
  } else {
    depth--;
    const top = stack.pop() || { id: 'ORPHAN' };
    if (top.id !== 'div') {
      console.log('CLOSED ' + top.id + ' at line ' + lineNum);
    }
    if (depth < 0) {
      console.log('EXTRA CLOSING DIV AT LINE ' + lineNum);
      depth = 0;
    }
  }
}
