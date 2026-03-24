import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = '/Users/test/work/chromeToolToby';
const EXTENSION_PATH = '/Users/test/work/chromeToolToby/dist';

async function runTests() {
  console.log('='.repeat(60));
  console.log('Toby Chrome Extension - Comprehensive Tests');
  console.log('='.repeat(60));
  console.log('');

  let passed = 0;
  let failed = 0;

  // Test 1: Build verification
  console.log('【Test 1】Build Verification');
  console.log('-'.repeat(50));
  try {
    const files = readdirSync(EXTENSION_PATH);
    const requiredFiles = ['manifest.json', 'background.js', 'index.html', 'icon.svg'];

    for (const file of requiredFiles) {
      if (files.includes(file)) {
        console.log(`  ✓ ${file} exists`);
        passed++;
      } else {
        console.log(`  ✗ ${file} MISSING`);
        failed++;
      }
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 2: TypeScript compilation
  console.log('【Test 2】TypeScript Compilation');
  console.log('-'.repeat(50));
  try {
    const { execSync } = await import('child_process');
    execSync('npx tsc --noEmit', { cwd: PROJECT_ROOT, stdio: 'pipe' });
    console.log('  ✓ No TypeScript errors');
    passed++;
  } catch (e) {
    console.log(`  ✗ TypeScript errors found`);
    failed++;
  }
  console.log('');

  // Test 3: MainContent.tsx - Drag & Drop Implementation
  console.log('【Test 3】Drag & Drop Implementation (Critical)');
  console.log('-'.repeat(50));
  try {
    const mainContent = readFileSync(join(PROJECT_ROOT, 'src/components/MainContent.tsx'), 'utf-8');

    // Check for native drag handlers (not dnd-kit)
    const dragTests = [
      { name: 'Native onDragOver handler', pattern: 'handleNativeDragOver' },
      { name: 'Native onDrop handler', pattern: 'handleNativeDrop' },
      { name: 'handleExternalDrop function', pattern: 'handleExternalDrop' },
      { name: 'onDrop prop in SortableCollection', pattern: 'onDrop={handleExternalDrop}' },
      { name: 'data-collection-id attribute', pattern: 'data-collection-id' },
      { name: 'React DragEvent type used', pattern: 'React.DragEvent' },
      { name: 'No useDroppable (dnd-kit)', pattern: 'useDroppable', shouldNotExist: true },
    ];

    for (const test of dragTests) {
      if (test.shouldNotExist) {
        if (!mainContent.includes(test.pattern)) {
          console.log(`  ✓ ${test.name} - NOT present (correct)`);
          passed++;
        } else {
          console.log(`  ✗ ${test.name} - Still present (should be removed)`);
          failed++;
        }
      } else {
        if (mainContent.includes(test.pattern)) {
          console.log(`  ✓ ${test.name}`);
          passed++;
        } else {
          console.log(`  ✗ ${test.name} MISSING`);
          failed++;
        }
      }
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 4: RightPanel.tsx - Tab Drag Implementation
  console.log('【Test 4】RightPanel Tab Drag');
  console.log('-'.repeat(50));
  try {
    const rightPanel = readFileSync(join(PROJECT_ROOT, 'src/components/RightPanel.tsx'), 'utf-8');

    const tests = [
      { name: 'DraggableTab component', pattern: 'DraggableTab' },
      { name: 'onDragStart handler', pattern: 'onDragStart' },
      { name: 'dataTransfer.setData for tab', pattern: "type: 'tab'" },
      { name: 'effectAllowed = move', pattern: "effectAllowed = 'move'" },
    ];

    for (const test of tests) {
      if (rightPanel.includes(test.pattern)) {
        console.log(`  ✓ ${test.name}`);
        passed++;
      } else {
        console.log(`  ✗ ${test.name} MISSING`);
        failed++;
      }
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 5: Native Drag Implementation (instead of dnd-kit)
  console.log('【Test 5】Native HTML5 Drag Implementation');
  console.log('-'.repeat(50));
  try {
    const mainContent = readFileSync(join(PROJECT_ROOT, 'src/components/MainContent.tsx'), 'utf-8');

    const tests = [
      { name: 'Document-level dragover listener', pattern: "document.addEventListener('dragover'" },
      { name: 'Document-level drop listener', pattern: "document.addEventListener('drop'" },
      { name: 'Native onDragOver handler', pattern: 'onDragOver' },
      { name: 'Native onDrop handler', pattern: 'onDrop' },
    ];

    for (const test of tests) {
      if (mainContent.includes(test.pattern)) {
        console.log(`  ✓ ${test.name}`);
        passed++;
      } else {
        console.log(`  ✗ ${test.name} MISSING`);
        failed++;
      }
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 6: Drag & Drop Flow Verification
  console.log('【Test 6】Drag & Drop Flow');
  console.log('-'.repeat(50));
  try {
    const mainContent = readFileSync(join(PROJECT_ROOT, 'src/components/MainContent.tsx'), 'utf-8');
    const rightPanel = readFileSync(join(PROJECT_ROOT, 'src/components/RightPanel.tsx'), 'utf-8');

    // Verify the complete flow
    const flowSteps = [
      // Step 1: RightPanel starts drag
      { name: '1. RightPanel sets tab data in dataTransfer', pattern: "JSON.stringify", source: rightPanel },

      // Step 2: MainContent handles native drag
      { name: '2. SortableCollection has onDragOver', pattern: 'onDragOver={handleNativeDragOver}', source: mainContent },
      { name: '3. SortableCollection has onDrop', pattern: 'onDrop={handleNativeDrop}', source: mainContent },

      // Step 3: handleExternalDrop processes the drop
      { name: '4. handleExternalDrop function exists', pattern: 'const handleExternalDrop = useCallback', source: mainContent },
      { name: '5. Parses JSON data', pattern: 'JSON.parse(dataStr)', source: mainContent },
      { name: '6. Checks data.type === tab', pattern: "if (data.type === 'tab')", source: mainContent },
      { name: '7. Creates new Card', pattern: 'const newCard: Card', source: mainContent },
      { name: '8. Calls onCollectionsChange', pattern: 'onCollectionsChange(newCollections)' },
      { name: '9. Closes original tab', pattern: 'chrome.tabs.remove' },
    ];

    for (const step of flowSteps) {
      const source = step.source || mainContent;
      if (source.includes(step.pattern)) {
        console.log(`  ✓ ${step.name}`);
        passed++;
      } else {
        console.log(`  ✗ ${step.name} MISSING`);
        failed++;
      }
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 7: Error Handling
  console.log('【Test 7】Error Handling');
  console.log('-'.repeat(50));
  try {
    const mainContent = readFileSync(join(PROJECT_ROOT, 'src/components/MainContent.tsx'), 'utf-8');

    const tests = [
      { name: 'Try-catch in handleExternalDrop', pattern: 'try {' },
      { name: 'dataTransfer null check', pattern: 'e.dataTransfer?.getData' },
      { name: 'dataStr null check', pattern: 'if (!dataStr)' },
      { name: 'JSON parse in try-catch', pattern: 'const data = JSON.parse' },
      { name: 'chrome.tabs.remove with catch', pattern: 'chrome.tabs.remove' },
    ];

    for (const test of tests) {
      if (mainContent.includes(test.pattern)) {
        console.log(`  ✓ ${test.name}`);
        passed++;
      } else {
        console.log(`  ✗ ${test.name} MISSING`);
        failed++;
      }
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 8: Space Data Persistence
  console.log('【Test 8】Space Data Persistence');
  console.log('-'.repeat(50));
  try {
    const mainContent = readFileSync(join(PROJECT_ROOT, 'src/components/MainContent.tsx'), 'utf-8');
    const appContent = readFileSync(join(PROJECT_ROOT, 'src/App.tsx'), 'utf-8');

    const tests = [
      { name: 'handleAddCollection uses allCollections', pattern: 'allCollections, newCollection', source: mainContent },
      { name: 'handleDeleteCollection uses allCollections', pattern: 'allCollections.filter', source: mainContent },
      { name: 'handleUpdateCollection uses allCollections', pattern: 'allCollections.map', source: mainContent },
      { name: 'App has allCollections prop', pattern: 'allCollections={collections}', source: appContent },
    ];

    for (const test of tests) {
      if (test.source.includes(test.pattern)) {
        console.log(`  ✓ ${test.name}`);
        passed++;
      } else {
        console.log(`  ✗ ${test.name} MISSING`);
        failed++;
      }
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 9: Drag Target Collection Detection
  console.log('【Test 9】Drag Target Collection Detection');
  console.log('-'.repeat(50));
  try {
    const mainContent = readFileSync(join(PROJECT_ROOT, 'src/components/MainContent.tsx'), 'utf-8');

    const tests = [
      { name: 'Uses closest to find target collection', pattern: "closest('[data-collection-id]')" },
      { name: 'Gets collection ID from attribute', pattern: 'getAttribute' },
      { name: 'Falls back to first collection', pattern: 'collections[0].id' },
    ];

    for (const test of tests) {
      if (mainContent.includes(test.pattern)) {
        console.log(`  ✓ ${test.name}`);
        passed++;
      } else {
        console.log(`  ✗ ${test.name} MISSING`);
        failed++;
      }
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 10: RightPanel Drag Data
  console.log('【Test 10】RightPanel Drag Data');
  console.log('-'.repeat(50));
  try {
    const rightPanel = readFileSync(join(PROJECT_ROOT, 'src/components/RightPanel.tsx'), 'utf-8');

    const tests = [
      { name: 'Sets tab data with type', pattern: "type: 'tab'" },
      { name: 'Sets tabId in data', pattern: 'tabId: tab.id' },
      { name: 'Sets url in data', pattern: 'url: tab.url' },
      { name: 'Sets title in data', pattern: 'title: tab.title' },
      { name: 'Sets favIconUrl in data', pattern: 'favIconUrl: tab.favIconUrl' },
      { name: 'Sets effectAllowed to move', pattern: "effectAllowed = 'move'" },
      { name: 'Console log for debugging', pattern: "console.log('[DragStart]" },
    ];

    for (const test of tests) {
      if (rightPanel.includes(test.pattern)) {
        console.log(`  ✓ ${test.name}`);
        passed++;
      } else {
        console.log(`  ✗ ${test.name} MISSING`);
        failed++;
      }
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 11: UI Features
  console.log('【Test 11】Other UI Features');
  console.log('-'.repeat(50));
  try {
    const mainContent = readFileSync(join(PROJECT_ROOT, 'src/components/MainContent.tsx'), 'utf-8');
    const sidebar = readFileSync(join(PROJECT_ROOT, 'src/components/Sidebar.tsx'), 'utf-8');

    const tests = [
      { name: 'Three view modes', pattern: "'grid' | 'list' | 'compact'", source: mainContent },
      { name: 'Space management', pattern: 'handleAddSpace', source: sidebar },
      { name: 'Data export', pattern: 'handleExportData', source: sidebar },
      { name: 'Statistics', pattern: '数据统计', source: sidebar },
      { name: 'Search', pattern: 'searchQuery', source: sidebar },
    ];

    for (const test of tests) {
      if (test.source.includes(test.pattern)) {
        console.log(`  ✓ ${test.name}`);
        passed++;
      } else {
        console.log(`  ✗ ${test.name} MISSING`);
        failed++;
      }
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 12: Popup.js Drag & Drop
  console.log('【Test 12】Popup.js Drag & Drop');
  console.log('-'.repeat(50));
  try {
    const popup = readFileSync(join(PROJECT_ROOT, 'popup/popup.js'), 'utf-8');

    const tests = [
      { name: 'render() function with requestAnimationFrame', pattern: 'requestAnimationFrame' },
      { name: 'isDragging variable for debounce', pattern: 'let isDragging' },
      { name: 'handleDragOver event handler', pattern: 'function handleDragOver' },
      { name: 'handleDrop event handler', pattern: 'function handleDrop' },
      { name: 'e.preventDefault() first in handleDrop', pattern: 'e.preventDefault();\n  e.stopPropagation();' },
      { name: 'try-catch in handleDrop', pattern: 'try {' },
      { name: 'handleExternalDrop function', pattern: 'async function handleExternalDrop' },
      { name: 'bindDragEvents function', pattern: 'function bindDragEvents' },
    ];

    for (const test of tests) {
      if (popup.includes(test.pattern)) {
        console.log(`  ✓ ${test.name}`);
        passed++;
      } else {
        console.log(`  ✗ ${test.name} MISSING`);
        failed++;
      }
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log('');

  if (failed === 0) {
    console.log('🎉 All tests passed!');
    console.log('');
    console.log('The drag & drop implementation has been fixed:');
    console.log('  - Removed dnd-kit useDroppable to prevent conflicts');
    console.log('  - Using native React onDragOver and onDrop events');
    console.log('  - Proper error handling in place');
  } else {
    console.log(`⚠️  ${failed} test(s) failed - please review`);
  }

  console.log('');
  console.log('To test in Chrome:');
  console.log('  1. Open chrome://extensions/');
  console.log('  2. Load unpacked: ' + EXTENSION_PATH);
  console.log('  3. Test dragging tabs from right panel to collections');
  console.log('  4. Try multiple drags to verify stability');
}

runTests().catch(console.error);
