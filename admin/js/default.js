function loadIntoSlot(slotSelector, url) {
	const slotEl = document.querySelector(slotSelector);
	if (!slotEl) return;

	fetch(url)
		.then(function (res) {
			return res.text();
		})
		.then(function (htmlText) {
			slotEl.innerHTML = htmlText.trim();
		})
		.catch(function (err) {
			console.error('include load error:', slotSelector, url, err);
		});
}

// init 호출용
function init(options) {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function () {
			runInit(options);
		});
	} else {
		runInit(options);
	}
}

function runInit(options) {
	if (!options) options = {};

	// 헤더 로드
	if (options.headerUrl) {
		loadIntoSlot('.layout-header', options.headerUrl);
	}

	// 네비 로드
	if (options.navUrl) {
		loadIntoSlot('.layout-nav', options.navUrl);
	}
}
