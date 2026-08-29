// XanaxHook UI for Tampermonkey
// A dependency-free, sharp-edged browser UI inspired by classic GameSense /
// Linoria layouts. The API follows the Forma-style Lua UI used by the 333 files.
//
//   const ui = XanUI.CreateWindow({ Title: 'My script' });
//   const tab = ui.AddTab('Main');
//   const box = tab.AddLeftGroupbox('Settings');
//   box.AddToggle('Enabled', { Text: 'enabled', Default: true, Callback: fn });

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.XanUI = factory();
})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : (typeof window !== 'undefined' ? window : globalThis), function () {
    'use strict';

    const VERSION = '2.0.0';
    const instances = new Set();
    let styleInjected = false;

    const isFn = (value) => typeof value === 'function';
    const asText = (value) => value == null ? '' : String(value);
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

    function safeCall(callback, ...args) {
        if (!isFn(callback)) return;
        try { return callback(...args); } catch (error) { console.error('[XanUI] callback error:', error); }
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function injectStyle() {
        if (styleInjected) return;
        styleInjected = true;
        const style = el('style');
        style.id = 'xanui-style';
        style.textContent = `
            .xhu-root,.xhu-root *{box-sizing:border-box;font-family:Tahoma,Arial,sans-serif}
            .xhu-root{position:fixed;z-index:2147483646;color:#d8d8d8;font-size:12px;line-height:1.25;user-select:none}
            .xhu-window{width:760px;max-width:calc(100vw - 20px);max-height:calc(100vh - 20px);overflow:hidden;background:#171717;border:1px solid #3b3b3b;box-shadow:0 10px 35px #000b}
            .xhu-titlebar{height:38px;display:flex;align-items:center;padding:0 10px;background:#202020;border-bottom:1px solid #070707;cursor:move}
            .xhu-titlebar:before{content:'';width:3px;height:16px;background:#5b8dcc;margin-right:8px}
            .xhu-title{flex:1;color:#f0f0f0;font-size:12px;font-weight:bold;letter-spacing:.2px}.xhu-version{color:#777;font-size:10px;margin-right:8px}
            .xhu-icon{height:22px;width:22px;border:1px solid transparent;background:transparent;color:#919191;font-size:12px;line-height:16px;padding:0;cursor:pointer}.xhu-icon:hover{color:#fff;background:#343434;border-color:#4c4c4c}
            .xhu-body{display:flex;min-height:280px;max-height:calc(100vh - 58px)}
            .xhu-tabs{width:135px;flex:none;padding:8px 6px;background:#111;overflow:auto;border-right:1px solid #080808}.xhu-tab{display:block;width:100%;height:29px;border:1px solid transparent;background:transparent;color:#929292;text-align:left;padding:0 9px;margin:0 0 2px;cursor:pointer}.xhu-tab:hover{color:#ddd;background:#242424}.xhu-tab.xhu-active{color:#fff;background:#2b5d98;border-color:#3e73b2;box-shadow:inset 2px 0 #8db9ed}
            .xhu-content{flex:1;min-width:0;overflow:auto;padding:10px;background:#181818}.xhu-page{display:none;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;align-items:start}.xhu-page.xhu-active{display:grid}.xhu-column{min-width:0}.xhu-box{border:1px solid #3a3a3a;background:#202020;padding:9px;margin:0 0 10px}.xhu-box-title{height:15px;color:#a9a9a9;font-size:10px;font-weight:bold;letter-spacing:.8px;text-transform:uppercase;margin:0 0 9px;padding-bottom:4px;border-bottom:1px solid #343434}
            .xhu-control{margin:0 0 9px}.xhu-control:last-child{margin-bottom:0}.xhu-row{display:flex;align-items:center;gap:8px;min-height:22px}.xhu-label{flex:1;min-width:0;color:#d2d2d2;overflow:hidden;text-overflow:ellipsis}.xhu-help{color:#777;font-size:10px;margin-top:4px;line-height:1.35}.xhu-disabled{opacity:.45;pointer-events:none}
            .xhu-switch{position:relative;width:30px;height:16px;flex:none;padding:0;border:1px solid #4a4a4a;background:#141414;cursor:pointer}.xhu-switch:after{content:'';position:absolute;top:2px;left:2px;width:10px;height:10px;background:#777;transition:left .1s,background .1s}.xhu-switch.xhu-on{border-color:#5886b9;background:#315b8b}.xhu-switch.xhu-on:after{left:16px;background:#e5e5e5}
            .xhu-range-row{display:grid;grid-template-columns:minmax(0,1fr) 55px;gap:8px;align-items:center}.xhu-range{width:100%;height:14px;margin:0;accent-color:#5b8dcc;cursor:pointer}.xhu-value{width:55px;border:1px solid #3e3e3e;background:#141414;color:#b9cdea;text-align:center;padding:3px 2px;font-size:10px;font-variant-numeric:tabular-nums}
            .xhu-select,.xhu-input{width:100%;height:25px;border:1px solid #454545;background:#151515;color:#d8d8d8;padding:0 7px;outline:0;border-radius:0}.xhu-select:focus,.xhu-input:focus{border-color:#6695c9}.xhu-select{cursor:pointer}.xhu-select option{background:#1b1b1b;color:#ddd}
            .xhu-color{width:34px;height:23px;padding:0;border:1px solid #555;background:#111;cursor:pointer;border-radius:0}.xhu-button{width:100%;height:26px;border:1px solid #505050;background:#2b2b2b;color:#ddd;padding:0 9px;cursor:pointer;border-radius:0}.xhu-button:hover{background:#383838;border-color:#6d6d6d}.xhu-button:active{background:#1d1d1d}
            .xhu-divider{height:1px;background:#383838;margin:9px 0}.xhu-tabbox{border:1px solid #3a3a3a;background:#1c1c1c;padding:7px;margin:0 0 10px}.xhu-tabbox-title{color:#999;font-size:10px;font-weight:bold;letter-spacing:.7px;text-transform:uppercase;margin:0 0 7px}.xhu-tabbox-nav{display:flex;gap:2px;border-bottom:1px solid #3a3a3a;margin-bottom:8px}.xhu-tabbox-button{height:23px;border:1px solid transparent;background:transparent;color:#888;padding:0 8px;cursor:pointer}.xhu-tabbox-button:hover{color:#ddd;background:#282828}.xhu-tabbox-button.xhu-active{color:#fff;background:#2d5e95;border-color:#4d78a7}.xhu-tabbox-panel{display:none}.xhu-tabbox-panel.xhu-active{display:block}.xhu-tabbox-panel .xhu-box{border:0;background:transparent;padding:0;margin:0}.xhu-tabbox-panel .xhu-box-title{display:none}
            .xhu-notice{position:fixed;right:14px;bottom:14px;z-index:2147483647;display:flex;flex-direction:column;gap:5px}.xhu-toast{min-width:220px;max-width:330px;padding:9px 11px;background:#202020;border:1px solid #555;box-shadow:0 5px 18px #0009;color:#ddd}.xhu-toast-title{color:#9bbce3;font-weight:bold;margin-bottom:3px}.xhu-toast-close{float:right;border:0;background:transparent;color:#888;cursor:pointer}.xhu-hidden{display:none!important}
            @media(max-width:650px){.xhu-page{grid-template-columns:1fr}.xhu-tabs{width:112px}.xhu-window{width:calc(100vw - 20px)}}
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function normalizeOptions(options) { return options || {}; }

    class ControlGroup {
        constructor(owner, mount, title) {
            this.window = owner; this.mount = mount; this.root = el('section', 'xhu-box');
            this.titleNode = el('div', 'xhu-box-title', title || 'settings'); this.root.appendChild(this.titleNode); mount.appendChild(this.root);
        }
        _control(id, options, build) { const opts = normalizeOptions(options); const wrap = el('div', 'xhu-control'); wrap.dataset.xhuId = id; const control = build(wrap, opts); if (control && typeof control === 'object') control.Root = wrap; this.window._controls.set(id, control); this.root.appendChild(wrap); return control; }
        _setDisabled(wrap, disabled) { wrap.classList.toggle('xhu-disabled', !!disabled); }

        AddToggle(id, options) {
            return this._control(id, options, (wrap, opts) => {
                const row = el('div', 'xhu-row'); const label = el('span', 'xhu-label', opts.Text || id); const button = el('button', 'xhu-switch'); button.type = 'button';
                let value = opts.Default === true; let disabled = !!opts.Disabled; const listeners = new Set();
                const api = { Value: value, Enabled: value, Disabled: disabled, Get: () => value, OnChange: (fn) => { if (isFn(fn)) listeners.add(fn); return api; }, Set: (next, silent) => { value = !!next; api.Value = value; api.Enabled = value; button.classList.toggle('xhu-on', value); if (!silent) { safeCall(opts.Callback, value); listeners.forEach((fn) => safeCall(fn, value)); } return api; }, SetDisabled: (next) => { disabled = !!next; api.Disabled = disabled; this._setDisabled(wrap, disabled); return api; }, Reset: () => api.Set(opts.Default === true), Destroy: () => wrap.remove() };
                const toggle = () => { if (!disabled) api.Set(!value); }; button.addEventListener('click', toggle); label.addEventListener('click', toggle); row.append(label, button); wrap.appendChild(row);
                if (opts.Tooltip) wrap.appendChild(el('div', 'xhu-help', opts.Tooltip)); api.Set(value, true); this._setDisabled(wrap, disabled); if (opts.FireOnInit) safeCall(opts.Callback, value); return api;
            });
        }

        AddSlider(id, options) {
            return this._control(id, options, (wrap, opts) => {
                const min = Number.isFinite(Number(opts.Min)) ? Number(opts.Min) : 0; const max = Number.isFinite(Number(opts.Max)) ? Number(opts.Max) : 100; const step = Number(opts.Step) || (opts.Rounding != null ? 1 / 10 ** Number(opts.Rounding) : 1);
                const row = el('div', 'xhu-row'); row.appendChild(el('span', 'xhu-label', opts.Text || id)); const rangeRow = el('div', 'xhu-range-row'); const range = el('input', 'xhu-range'); range.type = 'range'; range.min = min; range.max = max; range.step = step; const valueNode = el('output', 'xhu-value'); rangeRow.append(range, valueNode); wrap.append(row, rangeRow);
                let value = clamp(Number(opts.Default ?? min), min, max); let disabled = !!opts.Disabled; const listeners = new Set(); const format = (next) => `${opts.Rounding != null ? Number(next).toFixed(Number(opts.Rounding)) : next}${opts.Suffix || ''}`;
                const api = { Value: value, Disabled: disabled, Get: () => value, OnChange: (fn) => { if (isFn(fn)) listeners.add(fn); return api; }, Set: (next, silent) => { const numeric = Number(next); value = clamp(Number.isFinite(numeric) ? numeric : min, min, max); api.Value = value; range.value = value; valueNode.textContent = format(value); if (!silent) { safeCall(opts.Callback, value); listeners.forEach((fn) => safeCall(fn, value)); } return api; }, SetDisabled: (next) => { disabled = !!next; api.Disabled = disabled; this._setDisabled(wrap, disabled); return api; }, Reset: () => api.Set(opts.Default ?? min), Destroy: () => wrap.remove() };
                range.addEventListener('input', () => { if (!disabled) api.Set(range.value); }); api.Set(value, true); this._setDisabled(wrap, disabled); if (opts.FireOnInit) safeCall(opts.Callback, value); return api;
            });
        }

        AddDropdown(id, options) {
            return this._control(id, options, (wrap, opts) => {
                const values = opts.Values || opts.Options || []; const entries = Array.isArray(values) ? values.map((value) => [value, value]) : Object.entries(values); const label = el('div', 'xhu-label', opts.Text || id); const select = el('select', 'xhu-select');
                entries.forEach(([value, text]) => { const option = el('option', '', text); option.value = asText(value); select.appendChild(option); }); if (opts.AllowEmpty) { const empty = el('option', '', opts.EmptyText || 'none'); empty.value = ''; select.insertBefore(empty, select.firstChild); }
                let value = asText(opts.Default ?? (entries[0] ? entries[0][0] : '')); let disabled = !!opts.Disabled; const listeners = new Set();
                const api = { Value: value, Disabled: disabled, Get: () => value, OnChange: (fn) => { if (isFn(fn)) listeners.add(fn); return api; }, Set: (next, silent) => { value = asText(next); api.Value = value; select.value = value; if (select.value !== value && entries.length) { value = select.value; api.Value = value; } if (!silent) { safeCall(opts.Callback, value); listeners.forEach((fn) => safeCall(fn, value)); } return api; }, SetDisabled: (next) => { disabled = !!next; api.Disabled = disabled; select.disabled = disabled; this._setDisabled(wrap, disabled); return api; }, Reset: () => api.Set(opts.Default ?? (entries[0] ? entries[0][0] : '')), Destroy: () => wrap.remove() };
                select.addEventListener('change', () => { if (!disabled) api.Set(select.value); }); wrap.append(label, select); api.Set(value, true); this._setDisabled(wrap, disabled); if (opts.FireOnInit) safeCall(opts.Callback, value); return api;
            });
        }

        AddInput(id, options) {
            return this._control(id, options, (wrap, opts) => {
                const label = el('div', 'xhu-label', opts.Text || id); const input = el('input', 'xhu-input'); input.type = opts.Type || (opts.Password ? 'password' : 'text'); input.placeholder = opts.Placeholder || ''; input.value = opts.Default ?? ''; let value = asText(input.value); let disabled = !!opts.Disabled; const listeners = new Set();
                const api = { Value: value, Disabled: disabled, Get: () => value, OnChange: (fn) => { if (isFn(fn)) listeners.add(fn); return api; }, Set: (next, silent) => { value = asText(next); api.Value = value; input.value = value; if (!silent) { safeCall(opts.Callback, value); listeners.forEach((fn) => safeCall(fn, value)); } return api; }, SetDisabled: (next) => { disabled = !!next; api.Disabled = disabled; input.disabled = disabled; this._setDisabled(wrap, disabled); return api; }, Reset: () => api.Set(opts.Default ?? ''), Destroy: () => wrap.remove() };
                input.addEventListener(opts.FireOnInput ? 'input' : 'change', () => { if (!disabled) api.Set(input.value); }); wrap.append(label, input); this._setDisabled(wrap, disabled); if (opts.FireOnInit) safeCall(opts.Callback, value); return api;
            });
        }

        AddColorPicker(id, options) {
            return this._control(id, options, (wrap, opts) => {
                const row = el('div', 'xhu-row'); row.appendChild(el('span', 'xhu-label', opts.Text || id)); const input = el('input', 'xhu-color'); input.type = 'color'; input.value = opts.Default || '#ffffff'; row.appendChild(input); wrap.appendChild(row); let value = input.value; let disabled = !!opts.Disabled; const listeners = new Set();
                const api = { Value: value, Disabled: disabled, Get: () => value, OnChange: (fn) => { if (isFn(fn)) listeners.add(fn); return api; }, Set: (next, silent) => { const normalized = asText(next); if (/^#[0-9a-f]{6}$/i.test(normalized)) { value = normalized; input.value = normalized; } api.Value = value; if (!silent) { safeCall(opts.Callback, value); listeners.forEach((fn) => safeCall(fn, value)); } return api; }, SetDisabled: (next) => { disabled = !!next; api.Disabled = disabled; input.disabled = disabled; this._setDisabled(wrap, disabled); return api; }, Reset: () => api.Set(opts.Default || '#ffffff'), Destroy: () => wrap.remove() };
                input.addEventListener('input', () => { if (!disabled) api.Set(input.value); }); api.Set(value, true); this._setDisabled(wrap, disabled); if (opts.FireOnInit) safeCall(opts.Callback, value); return api;
            });
        }

        AddKeyPicker(id, options) {
            return this._control(id, options, (wrap, opts) => {
                const label = el('span', 'xhu-label', opts.Text || id); const input = el('input', 'xhu-input'); input.readOnly = true; input.value = opts.Default || 'none'; wrap.append(label, input); let value = input.value; let listening = false; const listeners = new Set();
                const api = { Value: value, Get: () => value, OnChange: (fn) => { if (isFn(fn)) listeners.add(fn); return api; }, Set: (next, silent) => { value = asText(next) || 'none'; api.Value = value; input.value = value; if (!silent) { safeCall(opts.Callback, value); listeners.forEach((fn) => safeCall(fn, value)); } return api; }, Reset: () => api.Set(opts.Default || 'none'), Destroy: () => wrap.remove() };
                input.addEventListener('click', () => { listening = true; input.value = 'press key'; }); input.addEventListener('keydown', (event) => { event.preventDefault(); if (!listening) return; const key = event.key === ' ' ? 'space' : event.key.toLowerCase(); listening = false; api.Set(key); }); if (opts.FireOnInit) safeCall(opts.Callback, value); return api;
            });
        }

        AddDependency(control, predicate) { const target = control && (control.Root || control.root || control.Element); const update = () => { if (target) this._setDisabled(target, !safeCall(predicate, control)); }; if (control && isFn(control.OnChange)) control.OnChange(update); update(); return this; }
        AddButton(textOrOptions, callback) { const opts = typeof textOrOptions === 'object' ? textOrOptions : { Text: textOrOptions, Callback: callback }; const wrap = el('div', 'xhu-control'); const button = el('button', 'xhu-button', opts.Text || 'button'); button.type = 'button'; button.addEventListener('click', () => safeCall(opts.Callback || opts.Func)); wrap.appendChild(button); this.root.appendChild(wrap); return { Element: button, Click: () => button.click(), SetText: (text) => { button.textContent = text; }, Destroy: () => wrap.remove() }; }
        AddLabel(text) { const label = el('div', 'xhu-help', text); this.root.appendChild(label); return { Element: label, SetText: (next) => { label.textContent = next; }, Destroy: () => label.remove() }; }
        AddDivider() { const divider = el('div', 'xhu-divider'); this.root.appendChild(divider); return { Element: divider, Destroy: () => divider.remove() }; }
        SetVisible(visible) { this.root.classList.toggle('xhu-hidden', !visible); return this; }
        SetTitle(title) { this.titleNode.textContent = title; return this; }
        Destroy() { this.root.remove(); return this; }
    }

    class TabBox {
        constructor(owner, mount, title) { this.window = owner; this.root = el('section', 'xhu-tabbox'); this.nav = el('div', 'xhu-tabbox-nav'); this.panels = el('div'); this.root.append(el('div', 'xhu-tabbox-title', title || 'settings'), this.nav, this.panels); mount.appendChild(this.root); this.tabs = []; }
        AddTab(name) { const button = el('button', 'xhu-tabbox-button', name); button.type = 'button'; const panel = el('div', 'xhu-tabbox-panel'); const group = new ControlGroup(this.window, panel, name); const record = { Name: name, Button: button, Panel: panel, Group: group }; button.addEventListener('click', () => this.SelectTab(record)); this.nav.appendChild(button); this.panels.appendChild(panel); this.tabs.push(record); if (this.tabs.length === 1) this.SelectTab(record); return group; }
        SelectTab(record) { this.tabs.forEach((tab) => { const active = tab === record; tab.Button.classList.toggle('xhu-active', active); tab.Panel.classList.toggle('xhu-active', active); }); this.ActiveTab = record; return this; }
        SetVisible(visible) { this.root.classList.toggle('xhu-hidden', !visible); return this; }
        Destroy() { this.root.remove(); return this; }
    }

    class Tab {
        constructor(window, name, options) { this.window = window; this.name = name; this.button = el('button', 'xhu-tab', options && options.Text || name); this.button.type = 'button'; this.page = el('div', 'xhu-page'); this.columns = [el('div', 'xhu-column'), el('div', 'xhu-column')]; this.page.append(...this.columns); window.tabBar.appendChild(this.button); window.content.appendChild(this.page); this.button.addEventListener('click', () => window.SelectTab(this)); }
        _box(title, side) { return new ControlGroup(this.window, this.columns[side === 'right' ? 1 : 0], title); }
        AddLeftGroupbox(title) { return this._box(title, 'left'); }
        AddRightGroupbox(title) { return this._box(title, 'right'); }
        AddGroupbox(title) { return this.AddLeftGroupbox(title); }
        AddLeftTabbox(title) { return new TabBox(this.window, this.columns[0], title); }
        AddRightTabbox(title) { return new TabBox(this.window, this.columns[1], title); }
        SetVisible(visible) { this.page.classList.toggle('xhu-hidden', !visible); return this; }
    }

    class Window {
        constructor(options) {
            injectStyle(); this.options = normalizeOptions(options); this._controls = new Map(); this._destroyed = false; this.root = el('div', 'xhu-root'); this.root.id = uid('xhu'); this.panel = el('div', 'xhu-window'); const bar = el('div', 'xhu-titlebar');
            this.titleNode = el('span', 'xhu-title', this.options.Title || 'XanaxHook'); this.versionNode = el('span', 'xhu-version', `v${VERSION}`); const close = el('button', 'xhu-icon', 'X'); close.title = 'Close'; close.addEventListener('click', () => this.Destroy()); bar.append(this.titleNode, this.versionNode, close);
            const body = el('div', 'xhu-body'); this.tabBar = el('nav', 'xhu-tabs'); this.content = el('main', 'xhu-content'); body.append(this.tabBar, this.content); this.panel.append(bar, body); this.root.appendChild(this.panel); document.body.appendChild(this.root); this._toastRoot = el('div', 'xhu-notice'); document.body.appendChild(this._toastRoot); this._makeDraggable(bar); this._loadPosition();
            this._keyHandler = (event) => { if (this.options.ToggleKey && this._matchesKey(event, this.options.ToggleKey)) { event.preventDefault(); this.Toggle(); } }; document.addEventListener('keydown', this._keyHandler); instances.add(this);
        }
        _matchesKey(event, key) { const wanted = asText(key).toLowerCase(); return event.key.toLowerCase() === wanted || event.code.toLowerCase() === wanted; }
        AddTab(name, options) { const tab = new Tab(this, name, options); if (!this.activeTab) this.SelectTab(tab); return tab; }
        SelectTab(tab) { this.activeTab = tab; [...this.tabBar.children].forEach((node) => node.classList.toggle('xhu-active', node === tab.button)); [...this.content.children].forEach((node) => node.classList.toggle('xhu-active', node === tab.page)); return tab; }
        Get(id) { return this._controls.get(id); }
        SetTitle(title) { this.titleNode.textContent = title; return this; }
        Notify(message, duration = 3000, title = 'XanaxHook') { const toast = el('div', 'xhu-toast'); const close = el('button', 'xhu-toast-close', 'X'); close.addEventListener('click', () => toast.remove()); toast.appendChild(close); toast.appendChild(el('div', 'xhu-toast-title', title)); toast.appendChild(el('div', '', message)); this._toastRoot.appendChild(toast); const timer = setTimeout(() => toast.remove(), duration); return { Element: toast, Dismiss: () => { clearTimeout(timer); toast.remove(); } }; }
        Toggle() { this.SetVisible(this.root.classList.contains('xhu-hidden')); return this; }
        SetVisible(visible) { this.root.classList.toggle('xhu-hidden', !visible); return this; }
        _makeDraggable(handle) { let drag = null; handle.addEventListener('pointerdown', (event) => { if (event.target.closest('button')) return; const rect = this.root.getBoundingClientRect(); drag = { dx: event.clientX - rect.left, dy: event.clientY - rect.top }; handle.setPointerCapture(event.pointerId); }); handle.addEventListener('pointermove', (event) => { if (!drag) return; const maxX = Math.max(8, innerWidth - this.root.offsetWidth - 8); const maxY = Math.max(8, innerHeight - this.root.offsetHeight - 8); this.root.style.left = `${clamp(event.clientX - drag.dx, 8, maxX)}px`; this.root.style.top = `${clamp(event.clientY - drag.dy, 8, maxY)}px`; this.root.style.right = 'auto'; this.root.style.bottom = 'auto'; }); handle.addEventListener('pointerup', () => { if (drag) this._savePosition(); drag = null; }); }
        _loadPosition() { try { const data = JSON.parse(localStorage.getItem(this.options.StorageKey || this.options.PositionKey || 'xanui-position')); if (data && Number.isFinite(data.left) && Number.isFinite(data.top)) { this.root.style.left = `${data.left}px`; this.root.style.top = `${data.top}px`; return; } } catch (_) {} this.root.style.right = '14px'; this.root.style.top = '14px'; }
        _savePosition() { try { const rect = this.root.getBoundingClientRect(); localStorage.setItem(this.options.StorageKey || this.options.PositionKey || 'xanui-position', JSON.stringify({ left: rect.left, top: rect.top })); } catch (_) {} }
        Destroy() { if (this._destroyed) return; this._destroyed = true; document.removeEventListener('keydown', this._keyHandler); this.root.remove(); this._toastRoot.remove(); instances.delete(this); safeCall(this.options.OnUnload); }
    }

    return { Version: VERSION, CreateWindow: (options) => new Window(options), DestroyAll: () => [...instances].forEach((instance) => instance.Destroy()) };
});
