import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import Meta from 'gi://Meta';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';

export default class GnomeBehafucha extends Extension {
    enable() {
        this._timeoutIds = [];
        try {
            this._settings = this.getSettings();
            this._clipboard = St.Clipboard.get_default();
            
            this._virtualDevice = Clutter.get_default_backend()
                .get_default_seat()
                .create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);

            Main.wm.addKeybinding(
                'convert-text-shortcut',
                this._settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.ALL,
                () => {
                    let id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
                        this._handleShortcut();
                        this._removeTimeout(id);
                        return GLib.SOURCE_REMOVE;
                    });
                    this._timeoutIds.push(id);
                }
            );
        } catch (e) {
            console.error(`GnomeBehafucha Error: ${e.message}`);
        }
    }

    _removeTimeout(id) {
        this._timeoutIds = this._timeoutIds.filter(tId => tId !== id);
    }

    disable() {
        if (this._timeoutIds) {
            this._timeoutIds.forEach(id => GLib.source_remove(id));
            this._timeoutIds = [];
        }
        Main.wm.removeKeybinding('convert-text-shortcut');
        this._settings = null;
        this._clipboard = null;
        this._virtualDevice = null;
        this._backupText = null;
    }

    _handleShortcut() {
        if (!this._virtualDevice) return;

        this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
            this._backupText = text;

            const MODIFIERS = [29, 42, 56, 125, 126, 97, 100];
            let time = GLib.get_monotonic_time() / 1000;
            MODIFIERS.forEach((keycode, index) => {
                this._virtualDevice.notify_key(time + (index * 1), keycode, Clutter.KeyState.RELEASED);
            });

            this._clipboard.set_text(St.ClipboardType.CLIPBOARD, "");

            let id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
                this._executeCopyPaste();
                this._removeTimeout(id);
                return GLib.SOURCE_REMOVE;
            });
            this._timeoutIds.push(id);
        });
    }

    _executeCopyPaste() {
        const CTRL = 29, C_KEY = 46, V_KEY = 47, SHIFT = 42, HOME = 102, END = 107;
        let time = GLib.get_monotonic_time() / 1000;

        this._virtualDevice.notify_key(time, CTRL, Clutter.KeyState.PRESSED);
        this._virtualDevice.notify_key(time + 30, C_KEY, Clutter.KeyState.PRESSED);
        this._virtualDevice.notify_key(time + 60, C_KEY, Clutter.KeyState.RELEASED);
        this._virtualDevice.notify_key(time + 90, CTRL, Clutter.KeyState.RELEASED);

        let id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
            this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
                if (!text || text.trim() === "") {
                    let st = GLib.get_monotonic_time() / 1000;
                    this._virtualDevice.notify_key(st, HOME, Clutter.KeyState.PRESSED);
                    this._virtualDevice.notify_key(st + 20, HOME, Clutter.KeyState.RELEASED);
                    this._virtualDevice.notify_key(st + 40, SHIFT, Clutter.KeyState.PRESSED);
                    this._virtualDevice.notify_key(st + 60, END, Clutter.KeyState.PRESSED);
                    this._virtualDevice.notify_key(st + 80, END, Clutter.KeyState.RELEASED);
                    this._virtualDevice.notify_key(st + 100, SHIFT, Clutter.KeyState.RELEASED);
                    this._virtualDevice.notify_key(st + 120, CTRL, Clutter.KeyState.PRESSED);
                    this._virtualDevice.notify_key(st + 140, C_KEY, Clutter.KeyState.PRESSED);
                    this._virtualDevice.notify_key(st + 160, C_KEY, Clutter.KeyState.RELEASED);
                    this._virtualDevice.notify_key(st + 180, CTRL, Clutter.KeyState.RELEASED);

                    let rid = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
                        this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (cb, text2) => {
                            if (text2 && text2.trim() !== "") {
                                this._processAndPaste(text2, CTRL, V_KEY);
                            } else if (this._backupText) {
                                this._clipboard.set_text(St.ClipboardType.CLIPBOARD, this._backupText);
                            }
                        });
                        this._removeTimeout(rid);
                        return GLib.SOURCE_REMOVE;
                    });
                    this._timeoutIds.push(rid);
                } else {
                    this._processAndPaste(text, CTRL, V_KEY);
                }
            });
            this._removeTimeout(id);
            return GLib.SOURCE_REMOVE;
        });
        this._timeoutIds.push(id);
    }

    _processAndPaste(text, CTRL, V_KEY) {
        const converted = this._convertText(text);
        this._clipboard.set_text(St.ClipboardType.CLIPBOARD, converted);

        let id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
            let pt = GLib.get_monotonic_time() / 1000;
            this._virtualDevice.notify_key(pt, CTRL, Clutter.KeyState.PRESSED);
            this._virtualDevice.notify_key(pt + 30, V_KEY, Clutter.KeyState.PRESSED);
            this._virtualDevice.notify_key(pt + 60, V_KEY, Clutter.KeyState.RELEASED);
            this._virtualDevice.notify_key(pt + 90, CTRL, Clutter.KeyState.RELEASED);

            let layoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                this._triggerLayoutSwitchShortcut();
                this._removeTimeout(layoutId);
                return GLib.SOURCE_REMOVE;
            });
            this._timeoutIds.push(layoutId);

            let restoreId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
                if (this._backupText) this._clipboard.set_text(St.ClipboardType.CLIPBOARD, this._backupText);
                this._backupText = null;
                this._removeTimeout(restoreId);
                return GLib.SOURCE_REMOVE;
            });
            this._timeoutIds.push(restoreId);
            this._removeTimeout(id);
            return GLib.SOURCE_REMOVE;
        });
        this._timeoutIds.push(id);
    }

    _triggerLayoutSwitchShortcut() {
        if (!this._virtualDevice) return;

        try {
            let wmSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.wm.keybindings' });
            let shortcuts = wmSettings.get_strv('switch-input-source') || [];
            
            if (shortcuts.length === 0 || shortcuts[0] === "") {
                shortcuts = wmSettings.get_strv('switch-input-source-backward') || [];
            }

            let shortcutStr = (shortcuts.length > 0 && shortcuts[0] !== "") ? shortcuts[0] : '<Super>space';

            const KEY_MAP = {
                '<super>': 125, '<meta>': 125, '<alt>': 56, '<shift>': 42, '<ctrl>': 29, '<control>': 29,
                'space': 57, 'alt_l': 56, 'alt_r': 100, 'shift_l': 42, 'shift_r': 62, 'control_l': 29, 'control_r': 97
            };

            let keycodes = [];
            let lowerStr = shortcutStr.toLowerCase();
            let parts = lowerStr.match(/<[^>]+>|[a-z0-9_]+/g) || [];

            parts.forEach(part => {
                if (KEY_MAP[part]) {
                    keycodes.push(KEY_MAP[part]);
                } else if (part.length === 1) {
                    let code = Clutter.keysym_to_keycode(part.charCodeAt(0));
                    if (code) keycodes.push(code);
                }
            });

            if (keycodes.length === 0) return;

            let lt = GLib.get_monotonic_time() / 1000;
            
            keycodes.forEach((code, index) => {
                this._virtualDevice.notify_key(lt + (index * 20), code, Clutter.KeyState.PRESSED);
            });

            let releaseStart = lt + (keycodes.length * 20) + 30;
            keycodes.slice().reverse().forEach((code, index) => {
                this._virtualDevice.notify_key(releaseStart + (index * 20), code, Clutter.KeyState.RELEASED);
            });

        } catch (e) {
            console.error(`GnomeBehafucha Universal Layout Switch Error: ${e.message}`);
        }
    }

    _convertText(text) {
        const EN_TO_HE = {
            'q': '/', 'w': "'", 'e': 'ק', 'r': 'ר', 't': 'א', 'y': 'ט', 'u': 'ו',
            'i': 'ן', 'o': 'ם', 'p': 'פ', '[': ']', ']': '[', 'a': 'ש', 's': 'ד',
            'd': 'ג', 'f': 'כ', 'g': 'ע', 'h': 'י', 'j': 'ח', 'k': 'ל', 'l': 'ך',
            ';': 'ף', "'": ';', 'z': 'ז', 'x': 'ס', 'c': 'ב', 'v': 'ה', 'b': 'נ',
            'n': 'מ', 'm': 'צ', ',': 'ת', '.': 'ץ', '/': '.'
        };
        const HE_TO_EN = Object.fromEntries(Object.entries(EN_TO_HE).map(([k, v]) => [v, k]));
        return text.split('').map(char => {
            const lowerChar = char.toLowerCase();
            if (HE_TO_EN[char]) return HE_TO_EN[char];
            if (EN_TO_HE[lowerChar]) return EN_TO_HE[lowerChar];
            return char;
        }).join('');
    }
}