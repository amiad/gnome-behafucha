import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import Meta from 'gi://Meta';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

export default class GnomeBehafucha extends Extension {
    enable() {
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
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
                        this._handleShortcut();
                        return GLib.SOURCE_REMOVE;
                    });
                }
            );
        } catch (e) {
            console.error(`GnomeBehafucha Error: ${e.message}`);
        }
    }

    disable() {
        Main.wm.removeKeybinding('convert-text-shortcut');
        this._settings = null;
        this._clipboard = null;
        this._virtualDevice = null;
    }

    _handleShortcut() {
        if (!this._virtualDevice) return;

        const MODIFIERS = [29, 42, 56, 125, 126, 97, 100];
        let time = GLib.get_monotonic_time() / 1000;

        MODIFIERS.forEach((keycode, index) => {
            this._virtualDevice.notify_key(time + (index * 2), keycode, Clutter.KeyState.RELEASED);
        });

        this._clipboard.set_text(St.ClipboardType.CLIPBOARD, "");

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this._executeCopyPaste();
            return GLib.SOURCE_REMOVE;
        });
    }

    _executeCopyPaste() {
        const CTRL = 29;
        const C_KEY = 46;
        const V_KEY = 47;
        let time = GLib.get_monotonic_time() / 1000;

        this._virtualDevice.notify_key(time, CTRL, Clutter.KeyState.PRESSED);
        this._virtualDevice.notify_key(time + 50, C_KEY, Clutter.KeyState.PRESSED);
        this._virtualDevice.notify_key(time + 100, C_KEY, Clutter.KeyState.RELEASED);
        this._virtualDevice.notify_key(time + 150, CTRL, Clutter.KeyState.RELEASED);

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
            this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
                if (!text || text.trim() === "") return;

                const converted = this._convertText(text);
                this._clipboard.set_text(St.ClipboardType.CLIPBOARD, converted);

                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
                    let pt = GLib.get_monotonic_time() / 1000;
                    this._virtualDevice.notify_key(pt, CTRL, Clutter.KeyState.PRESSED);
                    this._virtualDevice.notify_key(pt + 50, V_KEY, Clutter.KeyState.PRESSED);
                    this._virtualDevice.notify_key(pt + 100, V_KEY, Clutter.KeyState.RELEASED);
                    this._virtualDevice.notify_key(pt + 150, CTRL, Clutter.KeyState.RELEASED);
                    return GLib.SOURCE_REMOVE;
                });
            });
            return GLib.SOURCE_REMOVE;
        });
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
            
            // If it's Hebrew, convert to English
            if (HE_TO_EN[char]) {
                return HE_TO_EN[char];
            }
            
            // If it's English, convert to Hebrew
            if (EN_TO_HE[lowerChar]) {
                return EN_TO_HE[lowerChar];
            }
            
            // Return as is if no mapping exists
            return char;
        }).join('');
    }
}