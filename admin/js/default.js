function jw_select() {
	const $ = (s, c = document) => c.querySelector(s);
	const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
	const el = (t, cls) => { const n = document.createElement(t); if (cls) n.className = cls; return n; };
	const offWidth = (s) => {
		const t = el('div'); t.style.cssText =
			'position:absolute;visibility:hidden;white-space:nowrap;display:inline-block;'; t.textContent = s;
		document.body.appendChild(t); const w = t.offsetWidth; t.remove(); return w;
	};

	if (!window.__jwselect_docbound) {
		document.addEventListener('click', () => {
			document.querySelectorAll('.jw-select.open').forEach(wrap => {
				wrap.classList.remove('open');
				const box = wrap.querySelector('.jw-selected');
				if (box) box.classList.remove('active'), box.setAttribute('aria-expanded', 'false');
			});
		});
		window.__jwselect_docbound = true;
	}

	document.querySelectorAll('.select').forEach(nativeSel => {
		nativeSel.classList.remove('select');
		nativeSel.classList.add('jw-sr-only');

		const wrap = el('div', 'jw-select');
		nativeSel.parentNode.insertBefore(wrap, nativeSel);
		wrap.appendChild(nativeSel);

		const box = el('div', 'jw-selected');
		box.setAttribute('role', 'button');
		box.setAttribute('aria-haspopup', 'listbox');
		box.setAttribute('aria-expanded', 'false');
		wrap.appendChild(box);

		const setBox = () => {
			const opt = nativeSel.selectedOptions[0] || nativeSel.options[0];
			const label = opt ? opt.textContent : '';
			const icon = opt?.dataset?.icon;
			box.innerHTML = icon ? `<i class="${icon}"></i> ${label}` : label;
		};
		setBox();

		const list = el('ul', 'jw-select-list');
		list.setAttribute('role', 'listbox');
		wrap.appendChild(list);

		let maxWidth = 0;
		Array.from(nativeSel.options).forEach(o => {
			const li = el('li', 'jw-select-item');
			li.setAttribute('role', 'option');
			li.dataset.value = o.value;
			li.innerHTML = o.dataset?.icon ? `<i class="${o.dataset.icon}"></i> ${o.textContent}` : o.textContent;

			// ✅ disabled 옵션 반영
			if (o.disabled) {
				li.setAttribute('aria-disabled', 'true');
				li.classList.add('is-disabled');
			}

			if (o.selected) li.setAttribute('aria-selected', 'true');
			list.appendChild(li);
			maxWidth = Math.max(maxWidth, offWidth(o.textContent));
		});

		if (maxWidth) wrap.style.minWidth = (maxWidth + 40) + 'px';
		if (nativeSel.dataset.direction === 'up') wrap.classList.add('up');

		// ✅ 전체 select disabled 처리
		if (nativeSel.disabled) {
			wrap.classList.add('is-disabled');
			box.setAttribute('aria-disabled', 'true');
			box.tabIndex = -1;
		}

		const openList = () => {
			if (nativeSel.disabled) return; // 전체 비활성화면 열지 않음
			wrap.classList.add('open'); box.classList.add('active'); box.setAttribute('aria-expanded', 'true');
		};
		const closeList = () => {
			wrap.classList.remove('open'); box.classList.remove('active');
			box.setAttribute('aria-expanded', 'false');
		};

		const choose = (itemEl) => {
			// ✅ 항목이 disabled면 선택 막기
			if (itemEl.getAttribute('aria-disabled') === 'true') return;

			list.querySelectorAll('.jw-select-item[aria-selected="true"]').forEach(li => li.removeAttribute('aria-selected'));
			itemEl.setAttribute('aria-selected', 'true');
			nativeSel.value = itemEl.dataset.value;
			nativeSel.dispatchEvent(new Event('change', { bubbles: true }));
			setBox(); closeList();
		};

		box.addEventListener('click', (e) => {
			e.stopPropagation(); wrap.classList.contains('open') ? closeList() : openList();
		});
		list.addEventListener('click', (e) => {
			const item = e.target.closest('.jw-select-item'); if (!item) return;
			e.stopPropagation(); choose(item);
		});
	});
}

function setCookie(name, value, days) { const d = new Date(); d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000); document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/`; }
function getCookie(name) { const seg = `; ${document.cookie}`.split(`; ${name}=`); return (seg.length === 2) ? decodeURIComponent(seg.pop().split(';').shift()) : null; }

function getLangText(el, lang) {
	if (lang === 'eng') return el.getAttribute('data-lan-eng');
	return el.getAttribute('data-lan-kor') || el.getAttribute('data-lan-ko');
}

function language_apply(lang) {
	document.querySelectorAll('[data-lan-eng],[data-lan-kor],[data-lan-ko]').forEach(el => {
		const txt = getLangText(el, lang);
		if (!txt) return;

		const tag = el.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA') {
			if (el.hasAttribute('placeholder')) el.setAttribute('placeholder', txt);
			else el.value = txt;
		} else if (tag === 'IMG') {
			el.setAttribute('alt', txt);
		} else {
			el.textContent = txt;
		}
	});

	document.querySelectorAll('.lang-text').forEach(node => {
		node.textContent = (lang === 'eng') ? 'Korea' : 'English';
	});
}

function language_set() {
	const cur = getCookie('lang') || 'eng';
	const next = (cur === 'eng') ? 'kor' : 'eng';
	setCookie('lang', next, 365);
	if (next === 'kor') {
		location.reload();
	} else {
		language_apply(next);
	}
}

class Modal {
	constructor(action, width, height, sq) {
		this.action = action;
		this.width = width;
		this.height = height;
		this.sq = sq;
		this.el = null;
		this._abort = null;
	}

	static _toQuery(data) {
		if (!data) return '';
		if (typeof data === 'string') return data.replace(/^\?/, '');
		if (data instanceof FormData) {
			return new URLSearchParams([...data.entries()]).toString();
		}
		return new URLSearchParams(Object.entries(data)).toString();
	}

	async _loadHTML(url, data) {
		const ts = Date.now();
		const u = new URL(url, location.href);
		u.searchParams.set('_', ts);

		if (this._abort) this._abort.abort();
		this._abort = new AbortController();

		let res;
		try {
			if (data) {
				const body = Modal._toQuery(data);
				res = await fetch(u.toString(), {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
					body,
					signal: this._abort.signal
				});
			} else {
				res = await fetch(u.toString(), { signal: this._abort.signal, credentials: 'same-origin' });
			}
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return await res.text();
		} finally {
			this._abort = null;
		}
	}

	async open() {
		const d = document.createElement('dialog');
		d.style.width = (typeof this.width === 'number') ? `${this.width}px` : (this.width || '');
		d.style.height = (typeof this.height === 'number') ? `${this.height}px` : (this.height || '');
		d.innerHTML = 'Loading';
		document.body.appendChild(d);
		this.el = d;

		if (this.action) {
			try {
				const html = await this._loadHTML(this.action, this.sq);
				d.innerHTML = html;
				if (window.jw_select) jw_select();
				const closeBtn = d.querySelector('#closeDialog');
				if (closeBtn) {
					closeBtn.addEventListener('click', () => this.close(), { once: true });
				}
			} catch (err) {
				d.innerHTML = `<div style="padding:12px">Load error: ${String(err)}</div>`;
			}
		}

		if (typeof d.showModal === 'function') d.showModal();
		else d.setAttribute('open', '');
		return this;
	}

	async update(action, sq) {
		if (!this.el) return;
		const url = action || this.action;
		const data = (typeof sq !== 'undefined') ? sq : this.sq;
		if (!url) return;

		try {
			const html = await this._loadHTML(url, data);
			this.el.innerHTML = html;
			const closeBtn = this.el.querySelector('#closeDialog');
			if (closeBtn) {
				closeBtn.addEventListener('click', () => this.close(), { once: true });
			}
		} catch (err) {
			this.el.innerHTML = `<div style="padding:12px">Load error: ${String(err)}</div>`;
		}
	}

	close() {
		if (!this.el) return;
		if (this._abort) this._abort.abort();
		if (typeof this.el.close === 'function') {
			this.el.close();
		}
		this.el.remove();
		this.el = null;
	}
}

function modal(page, w, h, sq) {
	const m = new Modal(page, w, h, sq);
	m.open();
	return m;
}

function modal_close() {
	const dialogs = document.querySelectorAll('dialog');
	if (!dialogs.length) return;
	const last = dialogs[dialogs.length - 1];
	if (typeof last.close === 'function') {
		last.close();
	}
	last.remove();
}

function member_info(btn, page) {
	const root = btn.closest('.membermenu') || btn; // 버튼+메뉴 래퍼
	const box = root.querySelector('.position');
	let wrap = box.querySelector('.wrap');
	if (!wrap) { wrap = document.createElement('div'); wrap.className = 'wrap'; box.appendChild(wrap); }

	// 토글: 열려있으면 닫기
	if (box.classList.contains('on')) { return closeBox(); }

	// 열 때만 fetch
	if (!wrap.innerHTML.trim()) {
		wrap.innerHTML = '<div style="padding:10px;font-size:13px;color:#6b7280;">불러오는 중…</div>';
		fetch(page + '?' + Date.now(), { cache: 'no-store' })
			.then(r => { if (!r.ok) throw 0; return r.text(); })
			.then(html => { wrap.innerHTML = html; openBox(); })
			.catch(() => { wrap.innerHTML = '<div style="padding:10px;font-size:13px;color:#ef4444;">불러오기에 실패했어.</div>'; openBox(); });
	} else {
		openBox();
	}

	function openBox() {
		box.classList.add('on');

		// root(버튼+메뉴) 바깥 클릭 시에만 닫기 => 버튼 클릭은 바깥으로 취급 안 함
		const onDocDown = (e) => { if (!root.contains(e.target)) closeBox(); };

		// 내부 닫기 버튼(.closeMember_info)로 닫기
		const onInsideClick = (e) => {
			const t = e.target.closest('.closeMember_info');
			if (t) { e.preventDefault(); closeBox(); }
		};

		removeListeners();
		document.addEventListener('pointerdown', onDocDown, true);
		box.addEventListener('click', onInsideClick);
		box._off = () => {
			document.removeEventListener('pointerdown', onDocDown, true);
			box.removeEventListener('click', onInsideClick);
		};
	}

	function closeBox() {
		box.classList.remove('on');
		removeListeners();
	}

	function removeListeners() {
		if (box._off) { box._off(); box._off = null; }
	}
}

function helpTextChange(target, v) {
	const el = document.querySelector(target);
	if (!el) return;
	el.textContent = v || '';
}

function layerToggle(btn) {
	const menu = btn.closest('.layerToggleWrap')?.querySelector(':scope > .fab-menu');
	if (!menu) return;
	menu.classList.toggle('on');
}

