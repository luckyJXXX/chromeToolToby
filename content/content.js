/**
 * Toby Content Script
 * 处理页面上的选中文本和浮动工具提示
 */

// 监听选中文本
document.addEventListener('mouseup', handleTextSelection);

// 监听右键菜单
document.addEventListener('contextmenu', handleContextMenu);

let tooltip = null;
let selectionPopup = null;

/**
 * 处理文本选择
 */
function handleTextSelection(e) {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  // 延迟执行，确保选择完成
  setTimeout(() => {
    if (selectedText.length > 0) {
      showSelectionPopup(selection, selectedText);
    } else {
      hideSelectionPopup();
    }
  }, 10);
}

/**
 * 显示选中文本的弹出菜单
 */
function showSelectionPopup(selection, text) {
  hideSelectionPopup();

  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  selectionPopup = document.createElement('div');
  selectionPopup.className = 'toby-selection-popup';
  selectionPopup.innerHTML = `
    <button class="toby-popup-btn" data-action="search" title="搜索">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
    </button>
    <button class="toby-popup-btn" data-action="favorite" title="收藏">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
      </svg>
    </button>
    <button class="toby-popup-btn" data-action="copy" title="复制">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2"/>
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
      </svg>
    </button>
  `;

  // 定位
  const top = rect.top + window.scrollY - 40;
  const left = rect.left + window.scrollX + (rect.width / 2) - 60;

  selectionPopup.style.cssText = `
    position: absolute;
    top: ${top}px;
    left: ${left}px;
    z-index: 2147483647;
    display: flex;
    gap: 4px;
    padding: 6px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.2s, transform 0.2s;
  `;

  document.body.appendChild(selectionPopup);

  // 动画显示
  requestAnimationFrame(() => {
    selectionPopup.style.opacity = '1';
    selectionPopup.style.transform = 'translateY(0)';
  });

  // 绑定按钮事件
  selectionPopup.querySelectorAll('.toby-popup-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const action = btn.dataset.action;
      handlePopupAction(action, text);
    });
  });
}

/**
 * 隐藏选择弹出菜单
 */
function hideSelectionPopup() {
  if (selectionPopup) {
    selectionPopup.remove();
    selectionPopup = null;
  }
}

/**
 * 处理弹出菜单操作
 */
function handlePopupAction(action, text) {
  switch (action) {
    case 'search':
      const query = encodeURIComponent(text);
      window.open(`https://www.google.com/search?q=${query}`, '_blank');
      break;

    case 'favorite':
      saveSelectionToFavorites(text);
      break;

    case 'copy':
      navigator.clipboard.writeText(text).then(() => {
        showToast('已复制到剪贴板');
      });
      break;
  }

  hideSelectionPopup();
}

/**
 * 保存选中文本到收藏
 */
function saveSelectionToFavorites(text) {
  chrome.runtime.sendMessage({
    action: 'addFavoriteSelection',
    data: {
      url: window.location.href,
      title: document.title,
      selection: text,
      favicon: getFavicon()
    }
  }, (response) => {
    if (response && response.success) {
      showToast('已添加到收藏');
    }
  });
}

/**
 * 获取网站 favicon
 */
function getFavicon() {
  const link = document.querySelector('link[rel*="icon"]');
  if (link) {
    return link.href;
  }
  return `${window.location.origin}/favicon.ico`;
}

/**
 * 显示提示消息
 */
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toby-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    background: #111827;
    color: white;
    border-radius: 8px;
    font-size: 13px;
    z-index: 2147483647;
    opacity: 0;
    transition: opacity 0.3s;
  `;

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/**
 * 处理右键菜单
 */
function handleContextMenu(e) {
  // 可以添加自定义右键菜单逻辑
}

// 监听来自后台的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showNotification') {
    showToast(message.message);
    sendResponse({ success: true });
  }
  return true;
});

// 点击其他地方隐藏弹出菜单
document.addEventListener('mousedown', (e) => {
  if (selectionPopup && !selectionPopup.contains(e.target)) {
    hideSelectionPopup();
  }
});

console.log('Toby content script loaded');
