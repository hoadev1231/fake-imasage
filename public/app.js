const conversation = document.querySelector('.conversation');
const messages = document.querySelector('#messages');
const composer = document.querySelector('#composer');
const messageInput = document.querySelector('#message-input');
const sendButton = document.querySelector('.send-button');
const addButton = document.querySelector('#add-button');
const settingsDialog = document.querySelector('#settings-dialog');
const settingsForm = document.querySelector('#settings-form');
const messageDialog = document.querySelector('#message-dialog');
const messageForm = document.querySelector('#message-form');
const toast = document.querySelector('#toast');
for (const dialog of [settingsDialog, messageDialog]) {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}
let toastTimer;
let clearAnimationTimer;
let deletedMessagesSnapshot = null;
let editingMessageId;
let messageItems = Array.from(messages.querySelectorAll('.message'), (message) => ({
  id: `${Date.now()}-${Math.random()}`,
  text: message.querySelector('p').textContent,
  direction: message.classList.contains('sent') ? 'sent' : 'received',
  time: message.querySelector('time').textContent,
}));

function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function currentDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatThreadDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  const selectedDate = new Date(year, month - 1, day);
  const now = new Date();
  if (selectedDate.toDateString() === now.toDateString()) return 'Hôm nay';
  return selectedDate.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function displayTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value));
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : '';
}

function pickerTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value));
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : currentTime();
}

document.querySelector('#status-time').textContent = displayTime(currentTime());
conversation.dataset.threadDate = currentDate();
conversation.dataset.threadTime = '09:38';

function groupPhoneDigits(digits, groupSizes) {
  const groups = [];
  let offset = 0;
  let groupIndex = 0;
  while (offset < digits.length) {
    const size = groupSizes[Math.min(groupIndex, groupSizes.length - 1)];
    groups.push(digits.slice(offset, offset + size));
    offset += size;
    groupIndex += 1;
  }
  return groups.join(' ');
}

function formatPhoneNumber(value) {
  const hasPlus = /^\s*\+/.test(value);
  const digits = value.replace(/\D/g, '');
  if (!digits) return hasPlus ? '+' : '';

  if (digits.startsWith('84') && (hasPlus || digits.length > 10)) {
    return `+84 ${groupPhoneDigits(digits.slice(2), [2, 7])}`.trimEnd();
  }

  if (hasPlus) {
    const countryCodeLength = /^[17]/.test(digits) ? 1 : 2;
    const countryCode = digits.slice(0, countryCodeLength);
    return `+${countryCode} ${groupPhoneDigits(digits.slice(countryCodeLength), [3, 3, 4])}`.trimEnd();
  }

  const subscriberDigits = digits.startsWith('0') ? digits.slice(1) : digits;
  return `+84 ${groupPhoneDigits(subscriberDigits, [2, 7])}`.trimEnd();
}

function subscriberDigitsBeforeCaret(value, caret) {
  const prefixLength = value.startsWith('+84') ? 3 : 0;
  let digitCount = value.slice(prefixLength, caret).replace(/\D/g, '').length;
  if (prefixLength === 0 && value.replace(/\D/g, '').startsWith('0') && digitCount > 0) digitCount -= 1;
  return digitCount;
}

function caretAfterSubscriberDigitCount(value, digitCount) {
  const prefixLength = value.startsWith('+84') ? 3 : 0;
  if (digitCount === 0) return value[prefixLength] === ' ' ? prefixLength + 1 : prefixLength;
  let seenDigits = 0;
  for (let index = prefixLength; index < value.length; index += 1) {
    if (/\d/.test(value[index])) seenDigits += 1;
    if (seenDigits === digitCount) return index + 1;
  }
  return value.length;
}

const phoneInput = document.querySelector('#setting-name');
conversation.dataset.recipientPhone = phoneInput.value;
phoneInput.addEventListener('input', () => {
  const digitCountBeforeCaret = subscriberDigitsBeforeCaret(phoneInput.value, phoneInput.selectionStart);
  phoneInput.value = formatPhoneNumber(phoneInput.value);
  const caret = caretAfterSubscriberDigitCount(phoneInput.value, digitCountBeforeCaret);
  phoneInput.setSelectionRange(caret, caret);
});

function syncClearActions() {
  const canRestore = deletedMessagesSnapshot !== null;
  const disabled = !canRestore && messageItems.length === 0;
  const label = canRestore ? 'Khôi phục tin nhắn mới xóa' : 'Xóa tất cả tin nhắn';
  const iconPath = canRestore
    ? 'M3 7v5h5M3.5 12a7 7 0 1 0 2-5'
    : 'M4 6h12m-10 0 1 11h6l1-11M8 6V4h4v2m-3 3v5m2-5v5';
  document.querySelectorAll('.clear-action').forEach((button) => {
    button.disabled = disabled;
    button.classList.toggle('restore-action', canRestore);
    button.title = label;
    button.setAttribute('aria-label', label);
    button.querySelector('svg path')?.setAttribute('d', iconPath);
    const text = button.querySelector('.clear-action-label');
    if (text) text.textContent = label;
  });
}

function renderMessages() {
  if (messages.classList.contains('is-clearing')) {
    clearTimeout(clearAnimationTimer);
    messages.classList.remove('is-clearing');
  }
  messages.replaceChildren();
  for (const item of messageItems) {
    const row = document.createElement('div');
    const bubble = document.createElement('article');
    const content = document.createElement('p');
    const time = document.createElement('time');
    const deleteHint = document.createElement('span');
    row.className = `message-row ${item.direction}`;
    row.dataset.messageId = item.id;
    deleteHint.className = 'swipe-delete-hint';
    deleteHint.setAttribute('aria-hidden', 'true');
    deleteHint.textContent = 'Xóa';
    bubble.className = `message ${item.direction}`;
    bubble.dataset.messageId = item.id;
    bubble.tabIndex = 0;
    bubble.setAttribute('role', 'button');
    bubble.setAttribute('aria-label', `Chỉnh sửa tin nhắn: ${item.text}`);
    content.textContent = item.text;
    time.textContent = displayTime(item.time);
    bubble.append(content, time);
    row.append(deleteHint, bubble);
    messages.append(row);

    if (item.direction === 'sent') {
      const receipt = document.createElement('span');
      receipt.className = 'delivery-status';
      receipt.textContent = 'Đã gửi';
      messages.append(receipt);
    }
  }
  syncClearActions();
}

function openMessageDialog({ messageId = null, text = '', direction = 'sent', time = currentTime() } = {}) {
  editingMessageId = messageId;
  const isEditing = messageId !== null;
  document.querySelector('#message-title').textContent = isEditing ? 'Chỉnh sửa tin nhắn' : 'Tin nhắn mới';
  document.querySelector('#message-submit-button').textContent = isEditing ? 'Lưu thay đổi' : 'Thêm tin nhắn';
  document.querySelector('#delete-message-button').hidden = !isEditing;
  messageForm.elements.namedItem('text').value = text;
  messageForm.elements.namedItem('time').value = pickerTime(time);
  messageForm.elements.namedItem('direction').value = direction;
  document.querySelector('#edit-recipient-label').textContent = document.querySelector('#contact-name').textContent;
  messageDialog.showModal();
}

function openMessageEditor(messageId) {
  const item = messageItems.find((message) => message.id === messageId);
  if (!item) return;
  openMessageDialog({ messageId: item.id, text: item.text, direction: item.direction, time: item.time });
}

function deleteMessage(messageId) {
  messageItems = messageItems.filter((message) => message.id !== messageId);
  renderMessages();
  showToast('Đã xóa tin nhắn');
}

function openNewMessage(direction) {
  const text = messageInput.value.trim();
  if (direction === 'sent' && !text) return;
  openMessageDialog({ text, direction });
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 1900);
}

messageInput.addEventListener('input', () => {
  sendButton.disabled = messageInput.value.trim().length === 0;
});

composer.addEventListener('submit', (event) => {
  event.preventDefault();
  openNewMessage('sent');
});

addButton.addEventListener('click', () => {
  openNewMessage('received');
});

function handleMessageActivation(event) {
  if (conversation.classList.contains('result-view')) return;
  if (messages.classList.contains('is-clearing')) return;
  if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
  const bubble = event.target.closest('.message');
  if (!bubble) return;
  if (event.type === 'click' && swipedMessageId === bubble.dataset.messageId) return;
  if (event.type === 'keydown') event.preventDefault();
  openMessageEditor(bubble.dataset.messageId);
}

messages.addEventListener('click', handleMessageActivation);
messages.addEventListener('keydown', handleMessageActivation);

let activeSwipe = null;
let swipedMessageId = null;
let swipeClickTimer;
messages.addEventListener('pointerdown', (event) => {
  const isMobileTouch = event.pointerType === 'touch' && window.matchMedia('(max-width: 760px)').matches;
  const isDesktopMouse = event.pointerType === 'mouse' && event.button === 0 && window.matchMedia('(min-width: 761px)').matches;
  if (!isMobileTouch && !isDesktopMouse) return;
  if (conversation.classList.contains('result-view')) return;
  const bubble = event.target.closest('.message');
  if (!bubble) return;
  const row = bubble.closest('.message-row');
  if (isDesktopMouse) row.classList.add('is-pointer-down');
  activeSwipe = { id: bubble.dataset.messageId, pointerId: event.pointerId, x: event.clientX, y: event.clientY, bubble, row };
});

document.addEventListener('pointermove', (event) => {
  if (!activeSwipe || event.pointerId !== activeSwipe.pointerId) return;
  const deltaX = event.clientX - activeSwipe.x;
  const deltaY = event.clientY - activeSwipe.y;
  if (Math.abs(deltaY) > Math.abs(deltaX)) return;
  if (deltaX >= 0) {
    activeSwipe.row.classList.remove('is-swiping');
    activeSwipe.row.style.removeProperty('--swipe-progress');
    activeSwipe.bubble.style.transform = '';
    return;
  }
  activeSwipe.row.classList.add('is-swiping');
  const distance = Math.min(-deltaX, 104);
  const reveal = Math.min(1, Math.max(0, (distance - 12) / 52));
  activeSwipe.row.style.setProperty('--swipe-progress', reveal.toFixed(2));
  activeSwipe.bubble.style.transform = `translateX(${-distance}px)`;
});

document.addEventListener('pointerup', (event) => {
  if (!activeSwipe || event.pointerId !== activeSwipe.pointerId) return;
  const swipe = activeSwipe;
  activeSwipe = null;
  swipe.row.classList.remove('is-pointer-down');
  const deltaX = event.clientX - swipe.x;
  const deltaY = event.clientY - swipe.y;
  if (deltaX < -72 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
    swipe.row.classList.remove('is-swiping');
    swipe.row.classList.add('is-removing');
    swipe.row.style.setProperty('--swipe-progress', '1');
    swipe.bubble.style.transform = 'translateX(-115%)';
    swipedMessageId = swipe.id;
    clearTimeout(swipeClickTimer);
    swipeClickTimer = setTimeout(() => { swipedMessageId = null; }, 450);
    setTimeout(() => deleteMessage(swipe.id), 250);
    return;
  }

  if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
    swipedMessageId = swipe.id;
    clearTimeout(swipeClickTimer);
    swipeClickTimer = setTimeout(() => { swipedMessageId = null; }, 450);
  }
  swipe.row.classList.remove('is-swiping');
  swipe.row.style.removeProperty('--swipe-progress');
  swipe.bubble.style.transform = '';
});

document.addEventListener('pointercancel', (event) => {
  if (activeSwipe?.pointerId !== event.pointerId) return;
  activeSwipe.row.classList.remove('is-pointer-down');
  activeSwipe.row.classList.remove('is-swiping');
  activeSwipe.row.style.removeProperty('--swipe-progress');
  activeSwipe.bubble.style.transform = '';
  activeSwipe = null;
});

messageForm.addEventListener('submit', (event) => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();
  const data = new FormData(messageForm);
  const text = String(data.get('text')).trim();
  if (!text) return;
  const item = messageItems.find((message) => message.id === editingMessageId);
  if (item) {
    item.text = text;
    item.direction = String(data.get('direction'));
    item.time = pickerTime(data.get('time'));
  } else {
    messageItems.push({
      id: `${Date.now()}-${Math.random()}`,
      text,
      direction: String(data.get('direction')),
      time: pickerTime(data.get('time')),
    });
    messageInput.value = '';
    sendButton.disabled = true;
  }
  renderMessages();
  messageDialog.close();
  messages.scrollTop = messages.scrollHeight;
  messageInput.focus();
  showToast(item ? 'Đã cập nhật tin nhắn' : 'Đã thêm tin nhắn');
});

document.querySelector('#delete-message-button').addEventListener('click', () => {
  deleteMessage(editingMessageId);
  messageDialog.close();
});

function openSettings() {
  const data = new FormData(settingsForm);
  data.set('name', conversation.dataset.recipientPhone || phoneInput.value);
  data.set('threadDate', conversation.dataset.threadDate || currentDate());
  data.set('threadTime', conversation.dataset.threadTime || '09:38');
  data.set('time', pickerTime(document.querySelector('#status-time').textContent));
  data.set('battery', document.querySelector('#battery-level').style.width.replace('%', '') || '86');
  for (const [name, value] of data) {
    const field = settingsForm.elements.namedItem(name);
    if (field && field.type !== 'select-one') field.value = value;
  }
  settingsForm.elements.namedItem('wallpaper').value = conversation.dataset.wallpaper || 'light';
  settingsDialog.showModal();
}

document.querySelector('#customize-button').addEventListener('click', openSettings);
document.querySelector('.video-button').addEventListener('click', openSettings);
document.querySelector('#contact-trigger').addEventListener('click', openSettings);

settingsForm.addEventListener('submit', (event) => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();
  const data = new FormData(settingsForm);
  const name = String(data.get('name')).trim() || '+84';
  const threadDate = String(data.get('threadDate'));
  const threadTime = String(data.get('threadTime'));
  const time = String(data.get('time')).trim();
  const battery = Math.min(100, Math.max(1, Number(data.get('battery')) || 1));

  conversation.dataset.recipientPhone = name;
  conversation.dataset.threadDate = threadDate;
  conversation.dataset.threadTime = threadTime;
  document.querySelector('#contact-name').textContent = name;
  document.querySelector('#thread-date').textContent = formatThreadDate(threadDate);
  document.querySelector('#thread-time').textContent = displayTime(threadTime);
  if (/^\d{1,2}:\d{2}$/.test(time)) document.querySelector('#status-time').textContent = displayTime(time);
  document.querySelector('#battery-level').style.width = `${battery}%`;
  document.querySelector('#battery-percentage').textContent = String(battery);
  document.querySelector('.battery').setAttribute('aria-label', `Pin ${battery} phần trăm`);
  conversation.dataset.wallpaper = String(data.get('wallpaper'));
  settingsDialog.close();
  showToast('Đã cập nhật hội thoại');
});

function restoreDeletedMessages() {
  if (!deletedMessagesSnapshot) return;
  clearTimeout(clearAnimationTimer);
  messages.classList.remove('is-clearing');
  messageItems = [...deletedMessagesSnapshot, ...messageItems];
  deletedMessagesSnapshot = null;
  renderMessages();
  showToast('Đã khôi phục tin nhắn');
}

function clearMessages() {
  if (messageItems.length === 0 || messages.classList.contains('is-clearing')) return;
  deletedMessagesSnapshot = messageItems.map((message) => ({ ...message }));
  if (window.matchMedia('(min-width: 761px)').matches && messages.children.length > 0) {
    const rows = Array.from(messages.children);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stagger = reduceMotion ? 0 : 45;
    const duration = reduceMotion ? 0 : 220;
    messageItems = [];
    syncClearActions();
    messages.classList.add('is-clearing');
    rows.forEach((row, index) => row.style.setProperty('--clear-delay', `${index * stagger}ms`));
    clearAnimationTimer = setTimeout(() => {
      messages.classList.remove('is-clearing');
      renderMessages();
      showToast('Đã xóa hội thoại');
    }, Math.max(0, (rows.length - 1) * stagger + duration));
    return;
  }
  messageItems = [];
  renderMessages();
  showToast('Đã xóa hội thoại');
}

document.querySelectorAll('.clear-action').forEach((button) => button.addEventListener('click', () => {
  if (deletedMessagesSnapshot) restoreDeletedMessages();
  else clearMessages();
}));

document.querySelector('.back-button').addEventListener('click', () => showToast('Đây là bản xem trước hội thoại'));

function createResult(event) {
  const snapshot = {
    name: document.querySelector('#contact-name').textContent,
    threadDate: conversation.dataset.threadDate,
    threadTime: conversation.dataset.threadTime,
    time: document.querySelector('#status-time').textContent,
    battery: document.querySelector('#battery-percentage').textContent,
    wallpaper: conversation.dataset.wallpaper || 'light',
    messages: messageItems,
  };
  try {
    sessionStorage.setItem('fake-imasage-result', JSON.stringify(snapshot));
  } catch (error) {
    console.error('Không thể lưu snapshot hội thoại', error);
  }
  if (window.matchMedia('(min-width: 761px)').matches) {
    event.preventDefault();
    conversation.classList.add('result-view');
    showToast('Đã tạo kết quả');
    return;
  }
  window.location.assign('/result.html');
}

document.querySelectorAll('.create-action').forEach((button) => button.addEventListener('click', createResult));

renderMessages();