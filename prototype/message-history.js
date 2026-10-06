// Ctrl-P: the whole message history in a scrollable panel, newest first, so the player can read
// what has scrolled out of the small live panel. Each row carries its tone as a class and a
// marker character (see style.css), so the tones never rest on colour alone.

export const TONE_MARKS = {damage: '✖', magic: '✦', pickup: '+', warning: '!', plain: ''};

export function createHistoryPanel(doc, getRows) {
  const el = doc.createElement('aside');
  el.id = 'message-history';
  el.hidden = true;
  el.setAttribute('role', 'log');
  el.setAttribute('aria-label', 'Message history');

  function render() {
    const rows = getRows();
    const head = doc.createElement('small');
    head.textContent = rows.length ? 'MESSAGE HISTORY · Ctrl-P or Esc to close' : 'No messages yet · Ctrl-P or Esc to close';
    const lines = rows.map(({text, tone}) => {
      const row = doc.createElement('div');
      row.className = `msg msg-${tone}`;
      row.textContent = text;
      return row;
    });
    el.replaceChildren(head, ...lines);
    el.scrollTop = 0;
  }

  return {
    el,
    isOpen: () => !el.hidden,
    show() { render(); el.hidden = false; },
    hide() { el.hidden = true; },
    toggle() { if (el.hidden) this.show(); else this.hide(); },
    refresh() { if (!el.hidden) render(); },
  };
}
