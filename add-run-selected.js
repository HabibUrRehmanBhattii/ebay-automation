const fs = require('fs');
let r = fs.readFileSync(__dirname + '/renderer.js', 'utf8');

// 1. Update updateBulkPanel to also show/hide "Run Selected" button
let oldPanel = `function updateBulkPanel() {
  const selectedItems = queue.filter(item => item.selected);
  if (selectedItems.length > 0 && activeTab === 'pending') {
    bulkEditPanel.style.display = 'flex';
    bulkSelectCount.textContent = \`\${selectedItems.length} items selected\`;
  } else {
    bulkEditPanel.style.display = 'none';
  }
}`;

let newPanel = `function updateBulkPanel() {
  const selectedItems = queue.filter(item => item.selected);
  const runBtn = document.getElementById('run-selected-btn');
  if (selectedItems.length > 0 && activeTab === 'pending') {
    bulkEditPanel.style.display = 'flex';
    bulkSelectCount.textContent = \`\${selectedItems.length} items selected\`;
    if (runBtn) runBtn.style.display = '';
  } else {
    bulkEditPanel.style.display = 'none';
    if (runBtn) runBtn.style.display = 'none';
  }
}`;

if (r.includes(oldPanel)) {
  r = r.replace(oldPanel, newPanel);
  console.log('1. updateBulkPanel updated');
} else {
  console.log('1. updateBulkPanel NOT FOUND');
  process.exit(1);
}

// 2. Add "Run Selected" click handler near the start-btn
let marker = `  startBtn.addEventListener('click', () => isRunning ? stopAutomation() : startAutomation());`;
if (!r.includes(marker)) {
  console.log('2. startBtn marker NOT FOUND');
  process.exit(1);
}

let handler = `

  // Run Selected button — starts automation only for checked items
  const runSelectedBtn = document.getElementById('run-selected-btn');
  if (runSelectedBtn) {
    runSelectedBtn.addEventListener('click', async () => {
      const sel = queue.filter(i => i.selected && i.status === 'Pending');
      if (!sel.length) { alert('No pending items selected.'); return; }
      runSelectedBtn.disabled = true;
      runSelectedBtn.textContent = '...';
      addLog('[System]: Running ' + sel.length + ' selected items...', 'system');
      for (let i = 0; i < sel.length; i++) {
        const item = sel[i];
        const idx = queue.findIndex(q => q.name === item.name);
        addLog('[System]: [' + (i+1) + '/' + sel.length + '] ' + item.name, 'system');
        await window.api.runSingleItem({
          index: idx,
          folder: currentFolder,
          price: item.price || 65,
          template: item.template || guessTemplate(item.name),
          titleTemplate: titleTemplateInput?.value || '\\${name}'
        });
        if (i < sel.length - 1) {
          const wait = 30000 + Math.floor(Math.random() * 30000);
          addLog('[System]: Waiting ' + Math.round(wait/1000) + 's...', 'system');
          await new Promise(resolve => setTimeout(resolve, wait));
        }
      }
      await scanCurrentFolder();
      runSelectedBtn.disabled = false;
      runSelectedBtn.textContent = '▶ Run Selected';
      addLog('[System]: Done.', 'system');
    });
  }`;

r = r.replace(marker, handler + '\n' + marker);
console.log('2. Run Selected handler added');

fs.writeFileSync(__dirname + '/renderer.js', r);
console.log('renderer.js patched. Size:', r.length);
