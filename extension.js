import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import Meta from 'gi://Meta';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

export default class GnomeBehafucha extends Extension {
    enable() {
        this._settings = this.getSettings('org.gnome.shell.extensions.gnome-behafucha');
        this._clipboard = St.Clipboard.get_default();

        // Create virtual keyboard device via default seat
        this._virtualDevice = Clutter.get_default_backend()
            .get_default_seat()
            .create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);

        Main.wm.addKeybinding(
            'convert-text-shortcut',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            () => this._convertAndPaste()
        );
    }

    disable() {
        Main.wm.removeKeybinding('convert-text-shortcut');
        this._settings = null;
        this._clipboard = null;
        this._virtualDevice = null;
    }

    _convertAndPaste() {
        this._clipboard.get_text(St.ClipboardType.PRIMARY, (clipboard, text) => {
            if (!text) return;

            const converted = this._convertText(text);
            const textLength = text.length;

            this._clipboard.set_text(St.ClipboardType.CLIPBOARD, converted);
            this._clipboard.set_text(St.ClipboardType.PRIMARY, converted);

            // Small delay to ensure clipboard synchronization before starting simulation
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
                this._triggerPaste(textLength);
                return GLib.SOURCE_REMOVE;
            });
        });
    }

    _triggerPaste(length) {
        if (!this._virtualDevice) return;

        const SHIFT_L = 42;
        const INSERT = 110;
        const BACKSPACE = 14; 
        
        let count = 0;

        // Use a short interval for deletion to remain stable within the Main Loop
        let intervalId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5, () => {
            if (count < length) {
                let time = Clutter.get_current_event_time() * 1000;
                this._virtualDevice.notify_key(time, BACKSPACE, Clutter.KeyState.PRESSED);
                this._virtualDevice.notify_key(time + 100, BACKSPACE, Clutter.KeyState.RELEASED);
                count++;
                return GLib.SOURCE_CONTINUE;
            }

            // Once deletion is complete, proceed to paste
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10, () => {
                let time = Clutter.get_current_event_time() * 1000;
                this._virtualDevice.notify_key(time, SHIFT_L, Clutter.KeyState.PRESSED);
                this._virtualDevice.notify_key(time + 100, INSERT, Clutter.KeyState.PRESSED);
                this._virtualDevice.notify_key(time + 200, INSERT, Clutter.KeyState.RELEASED);
                this._virtualDevice.notify_key(time + 300, SHIFT_L, Clutter.KeyState.RELEASED);
                return GLib.SOURCE_REMOVE;
            });

            return GLib.SOURCE_REMOVE;
        });
    }

    _convertText(text) {
        const ENGLISH_TO_HEBREW = {
            'q': '/', 'w': "'", 'e': 'ק', 'r': 'ר', 't': 'א', 'y': 'ט', 'u': 'ו',
            'i': 'ן', 'o': 'ם', 'p': 'פ', '[': ']', ']': '[', 'a': 'ש', 's': 'ד',
            'd': 'ג', 'f': 'כ', 'g': 'ע', 'h': 'י', 'j': 'ח', 'k': 'ל', 'l': 'ך',
            ';': 'ף', "'": ';', 'z': 'ז', 'x': 'ס', 'c': 'ב', 'v': 'ה', 'b': 'נ',
            'n': 'מ', 'm': 'צ', ',': 'ת', '.': 'ץ', '/': '.'
        };

        const HEBREW_TO_ENGLISH = Object.fromEntries(
            Object.entries(ENGLISH_TO_HEBREW).map(([k, v]) => [v, k])
        );

        const hebrewCount = (text.match(/[\u0590-\u05FF]/g) || []).length;
        const englishCount = (text.match(/[a-zA-Z]/g) || []).length;
        const toHebrew = englishCount >= hebrewCount;

        return text.split('').map(char => {
            if (toHebrew) {
                return ENGLISH_TO_HEBREW[char.toLowerCase()] || char;
            } else {
                return HEBREW_TO_ENGLISH[char] || char;
            }
        }).join('');
    }
}