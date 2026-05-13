import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import Meta from 'gi://Meta';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

export default class GnomeBehafucha extends Extension {
    enable() {
        this._timeoutIds = [];
        try {
            this._settings = this.getSettings('org.gnome.shell.extensions.gnome-behafucha');
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
                    let id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
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
                this._virtualDevice.notify_key(time + (index * 2), keycode, Clutter.KeyState.RELEASED);
            });

            this._clipboard.set_text(St.ClipboardType.CLIPBOARD, "");

            let id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                this._executeCopyPaste();
                this._removeTimeout(id);
                return GLib.SOURCE_REMOVE;
            });
            this._timeoutIds.push(id);
        });
    }

    _executeCopyPaste() {
        const CTRL = 29;
        const C_KEY = 46;
        const V_KEY = 47;
        const SHIFT = 42;
        const HOME = 102;
        const END = 107;
        let time = GLib.get_monotonic_time() / 1000;

        this._virtualDevice.notify_key(time, CTRL, Clutter.KeyState.PRESSED);
        this._virtualDevice.notify_key(time + 50, C_KEY, Clutter.KeyState.PRESSED);
        this._virtualDevice.notify_key(time + 100, C_KEY, Clutter.KeyState.RELEASED);
        this._virtualDevice.notify_key(time + 150, CTRL, Clutter.KeyState.RELEASED);

        let id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
            this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
                if (!text || text.trim() === "") {
                    let st = GLib.get_monotonic_time() / 1000;
                    this._virtualDevice.notify_key(st, HOME, Clutter.KeyState.PRESSED);
                    this._virtualDevice.notify_key(st + 50, HOME, Clutter.KeyState.RELEASED);
                    this._virtualDevice.notify_key(st + 100, SHIFT, Clutter.KeyState.PRESSED);
                    this._virtualDevice.notify_key(st + 150, END, Clutter.KeyState.PRESSED);
                    this._virtualDevice.notify_key(st + 200, END, Clutter.KeyState.RELEASED);
                    this._virtualDevice.notify_key(st + 250, SHIFT, Clutter.KeyState.RELEASED);
                    this._virtualDevice.notify_key(st + 300, CTRL, Clutter.KeyState.PRESSED);
                    this._virtualDevice.notify_key(st + 350, C_KEY, Clutter.KeyState.PRESSED);
                    this._virtualDevice.notify_key(st + 400, C_KEY, Clutter.KeyState.RELEASED);
                    this._virtualDevice.notify_key(st + 450, CTRL, Clutter.KeyState.RELEASED);

                    let rid = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
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

        let id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
            let pt = GLib.get_monotonic_time() / 1000;
            this._virtualDevice.notify_key(pt, CTRL, Clutter.KeyState.PRESSED);
            this._virtualDevice.notify_key(pt + 50, V_KEY, Clutter.KeyState.PRESSED);
            this._virtualDevice.notify_key(pt + 100, V_KEY, Clutter.KeyState.RELEASED);
            this._virtualDevice.notify_key(pt + 150, CTRL, Clutter.KeyState.RELEASED);

            let restoreId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 600, () => {
                if (this._backupText) {
                    this._clipboard.set_text(St.ClipboardType.CLIPBOARD, this._backupText);
                }
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

    _convertText(text) {
        const EN_TO_HE = {
            'q': '/', 'w': "'", 'e': 'ק', 'r': 'ר', 't': 'א', 'y': 'ט', 'u': 'ו',
            'i': 'ן', 'o': 'ם', 'p': 'פ', '[': ']', ']': '[', 'a': 'ש', 's': 'ד',
            'd': 'ג', 'f': 'כ', 'g': 'ע', 'h': 'י', 'j': 'ח', 'k': 'ל', 'l': 'ך',
            ';': 'ף', "'": ';', 'z': 'ז', 'x': 'ס', 'c': 'ב', 'v': 'ה', 'b': 'נ',
            'n': 'מ', 'm': 'צ', ',': 'ת', '.': 'ץ', '/': '.'
        };

        const HE_TO_EN = Object.fromEntries(
            Object.entries(EN_TO_HE).map(([k, v]) => [v, k])
        );

        return text.split('').map(char => {
            const lowerChar = char.toLowerCase();
            if (HE_TO_EN[char]) return HE_TO_EN[char];
            if (EN_TO_HE[lowerChar]) return EN_TO_HE[lowerChar];
            return char;
        }).join('');
    }
}