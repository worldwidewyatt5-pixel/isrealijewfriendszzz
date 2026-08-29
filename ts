// XanaxHook Tampermonkey UI
// A small, dependency-free UI library for Tampermonkey userscripts.
// API intentionally mirrors the Forma-style Lua UI used by the 333 scripts:
//   const ui = XanaxUI.CreateWindow({ Title: 'My script' });
//   const tab = ui.AddTab('Main');
//   const box = tab.AddLeftGroupbox('Settings');
//   box.AddToggle('Enabled', { Text: 'enabled', Default: true, Callback: fn });

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.XanaxUI = factory();
})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : (typeof window !== 'undefined' ? window : globalThis), function () {
    'use strict';

    const VERSION = '1.0.0';
    const instances = new Set();
    let styleInjected = false;

    const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
    const isFn = (value) => typeof value === 'function';
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const asText = (value) => value == null ? '' : String(value);

    function injectStyle() {
        if (styleInjected) return;
        styleInjected = true;
        const style = document.createElement('style');
        style.id = 'xanaxhook-tm-ui-style';
        style.textContent = `
            .xhu-root,.xhu-root *{box-sizing:border-box;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}
            .xhu-root{position:fixed;z-index:2147483646;color:#e8ecf4;font-size:13px;line-height:1.35;user-select:none}
            .xhu-window{width:720px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);overflow:hidden;background:#11151d;border:1px solid #2b3443;border-radius:10px;box-shadow:0 16px 55px #0009}
            .xhu-titlebar{height:43px;display:flex;align-items:center;padding:0 13px;background:#171d27;border-bottom:1px solid #293241;cursor:move}
            .xhu-title{font-weight:700;letter-spacing:.2px;flex:1}.xhu-version{color:#7f8da3;font-size:10px;margin-right:10px}
            .xhu-icon{border:0;background:transparent;color:#8e9bb0;font-size:18px;cursor:pointer;padding:2px 6px}.xhu-icon:hover{color:#fff}
            .xhu-body{display:flex;min-height:240px;max-height:calc(100vh - 68px)}
            .xhu-tabs{width:142px;flex:none;padding:9px 7px;background:#0d1118;overflow:auto}.xhu-tab{display:block;width:100%;border:0;border-radius:6px;background:transparent;color:#8d99ab;text-align:left;padding:9px 10px;margin-bottom:3px;cursor:pointer}.xhu-tab:hover{background:#1a222e;color:#dce5f4}.xhu-tab.xhu-active{background:#2869d7;color:#fff}
            .xhu-content{padding:12px;overflow:auto;flex:1}.xhu-page{display:none;grid-template-columns:1fr 1fr;gap:10px}.xhu-page.xhu-active{display:grid}.xhu-column{min-width:0}.xhu-box{border:1px solid #293241;background:#151b24;border-radius:7px;padding:10px;margin-bottom:10px}.xhu-box-title{color:#aebbd0;text-transform:uppercase;font-size:10px;font-weight:700;letter-spacing:.8px;margin:-2px 0 9px}
            .xhu-control{margin:8px 0}.xhu-row{display:flex;align-items:center;gap:8px}.xhu-label{flex:1;color:#d9e0eb}.xhu-help{color:#7c8aa0;font-size:11px;margin-top:3px}.xhu-switch{width:34px;height:18px;border:0;border-radius:20px;background:#303b4b;position:relative;cursor:pointer}.xhu-switch:after{content:'';position:absolute;top:3px;left:3px;width:12px;height:12px;border-radius:50%;background:#9aa7b9;transition:.15s}.xhu-switch.xhu-on{background:#2869d7}.xhu-switch.xhu-on:after{left:19px;background:#fff}
            .xhu-range{width:100%;accent-color:#3978e2}.xhu-range-row{display:flex;gap:8px;align-items:center}.xhu-value{width:48px;color:#9fb8e8;text-align:right;font-variant-numeric:tabular-nums}.xhu-select,.xhu-input{width:100%;border:1px solid #344155;border-radius:5px;background:#0e131b;color:#e8ecf4;padding:7px 8px;outline:0}.xhu-select:focus,.xhu-input:focus{border-color:#3978e2}.xhu-button{width:100%;border:1px solid #3c6fca;border-radius:5px;background:#235bb3;color:#fff;padding:7px 9px;cursor:pointer}.xhu-button:hover{background:#2d6dd1}.xhu-color{width:34px;height:25px;padding:0;border:1px solid #45536a;background:transparent;border-radius:4px}.xhu-divider{height:1px;background:#293241;margin:10px 0}.xhu-notice{position:fixed;right:18px;bottom:18px;z-index:2147483647;display:flex;flex-direction:column;gap:8px}.xhu-toast{min-width:210px;padding:10px 12px;background:#171d27;border:1px solid #344155;border-radius:6px;box-shadow:0 8px 25px #0007;color:#e8ecf4}.xhu-hidden{display:none!important}
            @media(max-width:650px){.xhu-page{grid-template-columns:1fr}.xhu-tabs{width:112px}.xhu-window{width:calc(100vw - 24px)}}
        `;
        document.head.appendChild(style);
    }

    function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function normalizeOptions(options) {
        return options || {};
    }

    class ControlGroup {
        constructor(page, title) {
            this.page = page;
            this.root = element('section', 'xhu-box');
            this.root.appendChild(element('div', 'xhu-box-title', title || 'settings'));
            page.column.appendChild(this.root);
        }

        _control(id, options, build) {
            const opts = normalizeOptions(options);
            const wrap = element('div', 'xhu-control');
            wrap.dataset.xhuId = id;
            const control = build(wrap, opts);
            this.page.window._controls.set(id, control);
            this.root.appendChild(wrap);
            return control;
        }

        AddToggle(id, options) {
            return this._control(id, options, (wrap, opts) => {
                const row = element('div', 'xhu-row');
                row.appendChild(element('span', 'xhu-label', opts.Text || id));
                const button = element('button', 'xhu-switch');
                button.type = 'button';
                let value = opts.Default === true;
                const api = { Value: value, Set(v, silent) { value = !!v; api.Value = value; button.classList.toggle('xhu-on', value); if (!silent && isFn(opts.Callback)) opts.Callback(value); } };
                button.addEventListener('click', () => api.Set(!value));
                api.Set(value, true); row.appendChild(button); wrap.appendChild(row);
                if (opts.Tooltip) wrap.appendChild(element('div', 'xhu-help', opts.Tooltip));
                if (opts.Callback && opts.FireOnInit) opts.Callback(value);
                return api;
            });
        }

        AddSlider(id, options) {
            return this._control(id, options, (wrap, opts) => {
                const min = Number.isFinite(opts.Min) ? opts.Min : 0, max = Number.isFinite(opts.Max) ? opts.Max : 100, step = opts.Step || (opts.Rounding ? 1 / 10 ** opts.Rounding : 1);
                const row = element('div', 'xhu-row'); row.appendChild(element('span', 'xhu-label', opts.Text || id));
                const valueLabel = element('span', 'xhu-value'); const range = element('input', 'xhu-range'); range.type = 'range'; range.min = min; range.max = max; range.step = step;
                let value = clamp(Number(opts.Default ?? min), min, max);
                const format = (v) => `${opts.Rounding != null ? Number(v).toFixed(opts.Rounding) : v}${opts.Suffix || ''}`;
                const api = { Value: value, Set(v, silent) { value = clamp(Number(v) || 0, min, max); api.Value = value; range.value = value; valueLabel.textContent = format(value); if (!silent && isFn(opts.Callback)) opts.Callback(value); } };
                range.addEventListener('input', () => api.Set(range.value)); api.Set(value, true); row.append(range, valueLabel); wrap.appendChild(row); return api;
            });
        }

        AddDropdown(id, options) {
            return this._control(id, options, (wrap, opts) => {
                const select = element('select', 'xhu-select'); const values = opts.Values || opts.Options || [];
                Object.entries(values).forEach(([key, label]) => { const option = element('option'); option.value = Array.isArray(values) ? label : key; option.textContent = label; select.appendChild(option); });
                let value = opts.Default ?? (Array.isArray(values) ? values[0] : Object.keys(values)[0]);
                const api = { Value: value, Set(v, silent) { value = asText(v); api.Value = value; select.value = value; if (!silent && isFn(opts.Callback)) opts.Callback(value); } };
                select.addEventListener('change', () => api.Set(select.value)); api.Set(value, true); wrap.append(element('div', 'xhu-label', opts.Text || id), select); return api;
            });
        }

        AddInput(id, options) {
            return this._control(id, options, (wrap, opts) => {
                const input = element('input', 'xhu-input'); input.type = opts.Type || 'text'; input.placeholder = opts.Placeholder || ''; input.value = opts.Default ?? '';
                const api = { Value: input.value, Set(v, silent) { input.value = asText(v); api.Value = input.value; if (!silent && isFn(opts.Callback)) opts.Callback(api.Value); } };
                input.addEventListener('change', () => api.Set(input.value)); wrap.append(element('div', 'xhu-label', opts.Text || id), input); return api;
            });
        }

        AddColorPicker(id, options) {
            return this._control(id, options, (wrap, opts) => {
                const input = element('input', 'xhu-color'); input.type = 'color'; input.value = opts.Default || '#ffffff';
                const api = { Value: input.value, Set(v, silent) { input.value = v; api.Value = input.value; if (!silent && isFn(opts.Callback)) opts.Callback(api.Value); } };
                input.addEventListener('input', () => api.Set(input.value)); wrap.append(element('div', 'xhu-label', opts.Text || id), input); return api;
            });
        }

        AddButton(text, callback) { const button = element('button', 'xhu-button', text); button.type = 'button'; button.addEventListener('click', () => isFn(callback) && callback()); this.root.appendChild(element('div', 'xhu-control')).appendChild(button); return button; }
        AddLabel(text) { const label = element('div', 'xhu-help', text); this.root.appendChild(label); return label; }
        AddDivider() { const divider = element('div', 'xhu-divider'); this.root.appendChild(divider); return divider; }
    }

    class Tab {
        constructor(window, name) {
            this.window = window; this.name = name; this.button = element('button', 'xhu-tab', name); this.page = element('div', 'xhu-page'); this.page.window = window; this.page.column = element('div', 'xhu-column'); this.page.appendChild(this.page.column); this.page.appendChild(element('div', 'xhu-column')); window.tabBar.appendChild(this.button); window.content.appendChild(this.page);
            this.button.addEventListener('click', () => window.SelectTab(this));
        }
        _box(title, side) { const box = new ControlGroup(this.page, title); box.root.remove(); this.page.children[side === 'right' ? 1 : 0].appendChild(box.root); return box; }
        AddLeftGroupbox(title) { return this._box(title, 'left'); }
        AddRightGroupbox(title) { return this._box(title, 'right'); }
        AddGroupbox(title) { return this.AddLeftGroupbox(title); }
        AddLeftTabbox(title) { const box = this.AddLeftGroupbox(title); return { AddTab: (name) => box }; }
        AddRightTabbox(title) { const box = this.AddRightGroupbox(title); return { AddTab: (name) => box }; }
    }

    class Window {
        constructor(options) {
            injectStyle(); this.options = options || {}; this._controls = new Map(); this._destroyed = false;
            this.root = element('div', 'xhu-root'); this.root.id = uid('xhu'); this.panel = element('div', 'xhu-window'); const bar = element('div', 'xhu-titlebar');
            bar.appendChild(element('span', 'xhu-title', this.options.Title || 'XanaxHook')); bar.appendChild(element('span', 'xhu-version', `v${VERSION}`));
            const close = element('button', 'xhu-icon', '×'); close.title = 'Close'; close.addEventListener('click', () => this.Destroy()); bar.appendChild(close);
            const body = element('div', 'xhu-body'); this.tabBar = element('nav', 'xhu-tabs'); this.content = element('main'); body.append(this.tabBar, this.content); this.panel.append(bar, body); this.root.appendChild(this.panel); document.body.appendChild(this.root); this._makeDraggable(bar);
            this._toastRoot = element('div', 'xhu-notice'); document.body.appendChild(this._toastRoot); this._loadPosition(); instances.add(this);
        }
        AddTab(name) { const tab = new Tab(this, name); if (!this.activeTab) this.SelectTab(tab); return tab; }
        SelectTab(tab) { this.activeTab = tab; [...this.tabBar.children].forEach((node) => node.classList.toggle('xhu-active', node === tab.button)); [...this.content.children].forEach((node) => node.classList.toggle('xhu-active', node === tab.page)); }
        Notify(message, duration = 3000) { const toast = element('div', 'xhu-toast', message); this._toastRoot.appendChild(toast); setTimeout(() => toast.remove(), duration); }
        Toggle() { this.root.classList.toggle('xhu-hidden'); }
        SetVisible(visible) { this.root.classList.toggle('xhu-hidden', !visible); }
        _makeDraggable(handle) { let drag = null; handle.addEventListener('pointerdown', (event) => { if (event.target.closest('button')) return; const rect = this.panel.getBoundingClientRect(); drag = { x: event.clientX - rect.left, y: event.clientY - rect.top }; handle.setPointerCapture(event.pointerId); }); handle.addEventListener('pointermove', (event) => { if (!drag) return; this.root.style.left = `${clamp(event.clientX - drag.x, 8, innerWidth - 80)}px`; this.root.style.top = `${clamp(event.clientY - drag.y, 8, innerHeight - 45)}px`; this.root.style.right = 'auto'; this.root.style.bottom = 'auto'; }); handle.addEventListener('pointerup', () => { if (drag) this._savePosition(); drag = null; }); }
        _loadPosition() { try { const saved = JSON.parse(localStorage.getItem(this.options.StorageKey || 'xanaxhook-ui-position')); if (saved) { this.root.style.left = `${saved.left}px`; this.root.style.top = `${saved.top}px`; return; } } catch (_) {} this.root.style.right = '18px'; this.root.style.top = '18px'; }
        _savePosition() { try { const rect = this.root.getBoundingClientRect(); localStorage.setItem(this.options.StorageKey || 'xanaxhook-ui-position', JSON.stringify({ left: rect.left, top: rect.top })); } catch (_) {} }
        Destroy() { if (this._destroyed) return; this._destroyed = true; this.root.remove(); this._toastRoot.remove(); instances.delete(this); if (isFn(this.options.OnUnload)) this.options.OnUnload(); }
    }

    return { Version: VERSION, CreateWindow: (options) => new Window(options), DestroyAll: () => [...instances].forEach((instance) => instance.Destroy()) };
});
