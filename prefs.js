import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';

export default class GnomeBehafuchaPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.gnome-behafucha');
        
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({ title: 'Settings' });
        const row = new Adw.ActionRow({
            title: 'Keyboard Shortcut',
            subtitle: 'Shortcut to convert and paste text',
            activatable: true
        });

        const shortcutLabel = new Gtk.ShortcutLabel({
            disabled_text: 'Not Set',
            valign: Gtk.Align.CENTER
        });

        const updateLabel = () => {
            const shortcut = settings.get_strv('convert-text-shortcut');
            shortcutLabel.accelerator = (shortcut && shortcut.length > 0) ? shortcut[0] : '';
        };

        updateLabel();
        settings.connect('changed::convert-text-shortcut', updateLabel);

        const startEditing = () => {
            const editor = new Adw.Window({
                modal: true,
                transient_for: window,
                width_request: 450,
                height_request: 250,
                title: 'Set Shortcut'
            });

            const view = new Adw.StatusPage({
                title: 'Recording...',
                description: 'Press your combination (e.g., Ctrl+Shift+Z)\nEsc to cancel',
                icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic'
            });

            const eventController = new Gtk.EventControllerKey();
            editor.add_controller(eventController);

            eventController.connect('key-pressed', (controller, keyval, keycode, state) => {
                if (keyval === Gdk.KEY_Escape) {
                    editor.close();
                    return true;
                }

                // Masking out non-modifier bits
                let mask = state & Gtk.accelerator_get_default_mod_mask();
                
                // Identify modifier keys
                let isModifierKey = (
                    keyval === Gdk.KEY_Control_L || keyval === Gdk.KEY_Control_R ||
                    keyval === Gdk.KEY_Shift_L || keyval === Gdk.KEY_Shift_R ||
                    keyval === Gdk.KEY_Alt_L || keyval === Gdk.KEY_Alt_R ||
                    keyval === Gdk.KEY_Super_L || keyval === Gdk.KEY_Super_R
                );

                // If a non-modifier key is pressed with at least one modifier
                if (!isModifierKey && mask !== 0) {
                    // Use the lowercase version of the key to ensure Alt+Shift+Z works correctly
                    let cleanKeyval = Gdk.keyval_to_lower(keyval);
                    const accelerator = Gtk.accelerator_name(cleanKeyval, mask);
                    
                    if (accelerator) {
                        settings.set_strv('convert-text-shortcut', [accelerator]);
                        editor.close();
                    }
                }
                return true; 
            });

            editor.set_content(view);
            editor.present();
        };

        const editButton = new Gtk.Button({
            icon_name: 'edit-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat']
        });

        editButton.connect('clicked', startEditing);
        row.connect('activated', startEditing);

        row.add_suffix(shortcutLabel);
        row.add_suffix(editButton);
        group.add(row);
        page.add(group);
        window.add(page);
    }
}