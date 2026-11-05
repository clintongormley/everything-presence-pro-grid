// Runs inside the test page, after the Home Assistant and panel bundles.

window.PICKS = [];
window.CFG = {};

const merged = (id, cfg) => {
	window.CFG[id] = { ...window.CFG[id], ...cfg };
	return window.CFG[id];
};

// Renders the shipped `renderSelect`. Each call merges `cfg` into the previous
// one, so `sel(id, {})` is a parent re-rendering with nothing changed.
window.sel = (id, cfg) => {
	const c = merged(id, cfg);
	EPP.render(
		EPP.renderSelect({
			...c,
			testId: id,
			onSelect: (v) => {
				PICKS.push([id, v]);
				if (c.after) c.after(v);
			},
		}),
		document.getElementById(id),
	);
};

// The bare template the call sites used before `renderSelect`. It is the
// baseline for "nothing got worse on versions that already worked", and is not
// a copy of the code under test.
window.plain = (id, cfg) => {
	const c = merged(id, cfg);
	const { html, render } = EPP;
	render(
		html`<ha-select
			data-testid=${id}
			.value=${c.value}
			.options=${c.options}
			.disabled=${!!c.disabled}
			@selected=${(e) => {
				const val = e.detail.value;
				if (!val || val === c.value) return;
				PICKS.push([id, val]);
			}}
			@closed=${(e) => e.stopPropagation()}
		></ha-select>`,
		document.getElementById(id),
	);
};

// What the closed control shows, on either side of the 2026.3 change.
window.shownText = (el) => {
	const root = el.shadowRoot;
	return (
		root.querySelector(".mdc-select__selected-text")?.textContent ??
		root.querySelector("ha-picker-field")?.value ??
		null
	);
};

window.activePath = () => {
	const path = [];
	for (let a = document.activeElement; a; a = a.shadowRoot?.activeElement) {
		path.push(a.tagName);
	}
	return path;
};
