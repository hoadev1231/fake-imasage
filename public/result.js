const emptyState = document.querySelector('#result-empty');
const conversation = document.querySelector('#result-conversation');
let snapshot;

function formatThreadDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Hôm nay';
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

try {
  snapshot = JSON.parse(sessionStorage.getItem('fake-imasage-result'));
} catch {
  snapshot = null;
}

if (!snapshot || !Array.isArray(snapshot.messages)) {
  emptyState.hidden = false;
} else {
  conversation.hidden = false;
  conversation.dataset.wallpaper = ['light', 'dark', 'blue'].includes(snapshot.wallpaper) ? snapshot.wallpaper : 'light';
  const name = typeof snapshot.name === 'string' ? snapshot.name : 'Không tên';
  const statusTime = /^\d{1,2}:\d{2}$/.test(snapshot.time) ? snapshot.time : '9:41';
  const battery = Math.min(100, Math.max(1, Number.parseInt(snapshot.battery, 10) || 86));

  document.querySelector('#result-time').textContent = displayTime(statusTime);
  document.querySelector('#result-name').textContent = name;
  if (typeof snapshot.threadDate === 'string') {
    document.querySelector('#result-date').textContent = formatThreadDate(snapshot.threadDate);
  } else if (typeof snapshot.threadInfo === 'string' && snapshot.threadInfo.trim()) {
    document.querySelector('#result-date').textContent = snapshot.threadInfo;
    document.querySelector('#result-thread-time').textContent = '';
  }
  if (typeof snapshot.threadTime === 'string' && /^\d{1,2}:\d{2}$/.test(snapshot.threadTime)) {
    document.querySelector('#result-thread-time').textContent = displayTime(snapshot.threadTime);
  }
  document.querySelector('#result-battery-percentage').textContent = String(battery);
  document.querySelector('#result-battery-level').style.width = `${battery}%`;
  document.querySelector('#result-battery-icon').setAttribute('aria-label', `Pin ${battery} phần trăm`);

  const resultMessages = document.querySelector('#result-messages');
  for (const item of snapshot.messages) {
    if (typeof item.text !== 'string') continue;
    const bubble = document.createElement('article');
    const content = document.createElement('p');
    const time = document.createElement('time');
    const direction = item.direction === 'sent' ? 'sent' : 'received';
    bubble.className = `message ${direction}`;
    content.textContent = item.text;
    time.textContent = displayTime(item.time);
    bubble.append(content, time);
    resultMessages.append(bubble);

    if (direction === 'sent') {
      const receipt = document.createElement('span');
      receipt.className = 'delivery-status';
      receipt.textContent = 'Đã gửi';
      resultMessages.append(receipt);
    }
  }

  const firstMessage = snapshot.messages.find((item) => typeof item.time === 'string');
  if (!snapshot.threadDate && !snapshot.threadInfo && firstMessage) {
    document.querySelector('#result-date').textContent = 'Hôm nay';
    document.querySelector('#result-thread-time').textContent = displayTime(firstMessage.time);
  }
}