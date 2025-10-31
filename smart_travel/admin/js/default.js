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
