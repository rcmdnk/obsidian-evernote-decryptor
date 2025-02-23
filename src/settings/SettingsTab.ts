import { App, PluginSettingTab, Setting } from 'obsidian';
import { PLUGIN_NAME } from '../constants/plugin';
import EvernoteDecryptorPlugin from '../main';

export class SettingTab extends PluginSettingTab {
	plugin: EvernoteDecryptorPlugin;

	constructor(app: App, plugin: EvernoteDecryptorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h1', { text: `${PLUGIN_NAME} Settings` });

		new Setting(containerEl)
			.setName('Show Editor Menu')
			.setDesc('Show commands in the editor context menu')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showEditorMenu)
				.onChange(async (value) => {
					this.plugin.settings.showEditorMenu = value;
					await this.plugin.saveSettings();
					this.plugin.updateContextMenu();
				}));

		new Setting(containerEl)
			.setName('Show Mobile Buttons')
			.setDesc('Show encryption/decryption buttons in the mobile toolbar')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showMobileButtons)
				.onChange(async (value) => {
					this.plugin.settings.showMobileButtons = value;
					await this.plugin.saveSettings();
					// Reload plugin to apply changes
					this.plugin.unload();
					this.plugin.load();
				}));
	}
}
