import { Plugin, Menu, Editor, Platform, MarkdownView } from 'obsidian';
import { RESERVED_VALUE } from './constants/crypto';
import { PLUGIN_NAME, FORMAT_PREFIX, BUTTON_TEXT, BUTTON_CLASS, ID_PREFIX, PLACEHOLDER_PREFIX, CMD_DECRYPT, CMD_DECRYPT_REPLACE, CMD_ENCRYPT, CMD_FORMAT, CMD_FORMAT_NOTE } from './constants/plugin';
import { SettingTab } from './settings/SettingsTab';
import { makeViewPlugin, makeSecretButton, showDecryptedText } from './utils/editorUtils';
import { reservedPart, encryptWrapper, decryptWrapper } from './utils/cryptoUtils';

interface Settings {
	showEditorMenu: boolean;
	showMobileButtons: boolean;
}

const DEFAULT_SETTINGS: Settings = {
	showEditorMenu: true,
	showMobileButtons: true
};

export default class EvernoteDecryptorPlugin extends Plugin {
	settings: Settings;
	private contextMenuListener: (menu: Menu, editor: Editor) => void;
	private encryptedRegexp: RegExp;
	private codeBlockRegexp: RegExp;
	private commands: { id: string, name: string, callback: (editor: Editor) => void }[] = [];

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		this.encryptedRegexp = new RegExp(`(?<=^| )${reservedPart(RESERVED_VALUE, btoa(RESERVED_VALUE))}[^ \n\`*_~]*`, 'gm');
		this.codeBlockRegexp = /```[\s\S]+?```|^ {4,}(?![ *\-+]).*$|`[^\n`]+?`|\*\*[^\n*]+?\*\*|__[^\n_]+?__|~~[^\n~]+?~~|\*[^\n*]+?\*|_[^\n_]+?_/gm;

		if (Platform.isMobile && this.settings.showMobileButtons) {
			this.addMobileUI();
		}

		this.commands = [
			{ id: 'decrypt', name: CMD_DECRYPT, callback: (editor: Editor) => this.editorDecrypt(editor) },
			{ id: 'decrypt-replace', name: CMD_DECRYPT_REPLACE, callback: (editor: Editor) => this.decryptReplace(editor) },
			{ id: 'encrypt', name: CMD_ENCRYPT, callback: (editor: Editor) => this.makeSecret(editor) },
			{ id: 'format', name: CMD_FORMAT, callback: (editor: Editor) => this.formatSecret(editor) },
			{ id: 'format-note', name: CMD_FORMAT_NOTE, callback: (editor: Editor) => this.formatNoteSecrets(editor) }
		];

		this.commands.forEach(command => {
			this.addCommand({
				id: `${ID_PREFIX}${command.id}`,
				name: command.name,
				editorCallback: command.callback
			});
		});

		this.registerMarkdownPostProcessor((el, _) => {
			const codeBlocks = el.querySelectorAll('code');
			codeBlocks.forEach((codeBlock) => {
				if (codeBlock.parentElement === null) return;
				if (codeBlock.textContent === null) return;
				if (codeBlock.textContent.startsWith(FORMAT_PREFIX)) {
					const encryptedText = codeBlock.textContent.slice(FORMAT_PREFIX.length);
					codeBlock.style.display = 'none';

					const button = makeSecretButton(this.app, encryptedText, BUTTON_TEXT, BUTTON_CLASS);
					codeBlock.parentElement.insertBefore(button, codeBlock);
				}
			});
		});

		this.registerEditorExtension(makeViewPlugin(this.app, FORMAT_PREFIX, BUTTON_TEXT, BUTTON_CLASS));

		this.updateContextMenu();

		console.log(`${PLUGIN_NAME} loaded`);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	updateContextMenu(): void {
		if (this.contextMenuListener) {
			this.app.workspace.off('editor-menu', this.contextMenuListener);
		}
		this.contextMenuListener = (menu: Menu, editor: Editor) => {
			if (this.settings.showEditorMenu) {
				this.commands.forEach(command => {
					menu.addItem(item => {
						item.setTitle(command.name)
							.onClick(() => command.callback(editor));
					});
				});
			}
		};
		this.registerEvent(this.app.workspace.on('editor-menu', this.contextMenuListener));
	}

	editorDecrypt(editor: Editor): void {
		const selectedText = editor.getSelection();
		showDecryptedText(this.app, selectedText);
	}

	async decryptReplace(editor: Editor): Promise<void> {
		let selectedText = editor.getSelection().trim().replace(/^`+|`+$/g, '');
		if (selectedText.startsWith(FORMAT_PREFIX)) {
			selectedText = selectedText.slice(FORMAT_PREFIX.length);
		}
		const decryptedText = await decryptWrapper(this.app, selectedText);
		if (decryptedText !== null) {
			editor.replaceSelection(decryptedText);
		}
	}

	async makeSecret(editor: Editor): Promise<void> {
		const selectedText = editor.getSelection();
		const encryptedText = await encryptWrapper(this.app, selectedText);
		if (encryptedText !== null) {
			const formattedText = `\`${FORMAT_PREFIX}${encryptedText}\``;
			editor.replaceSelection(formattedText);
		}
	}

	formatSecret(editor: Editor): void {
		const selectedText = editor.getSelection();
		const formattedText = `\`${FORMAT_PREFIX}${selectedText}\``;
		editor.replaceSelection(formattedText);
	}

	formatNoteSecrets(editor: Editor): void {
		let doc = editor.getValue();
		const matches: { placeholder: string, content: string }[] = [];

		doc = doc.replace(this.codeBlockRegexp, (match: string) => {
			const placeholder = `__${PLACEHOLDER_PREFIX}_${matches.length}__`;
			matches.push({ placeholder, content: match });
			return placeholder;
		});

		doc = doc.replace(this.encryptedRegexp, (match: string) => {
			return `\`${FORMAT_PREFIX}${match}\``
		});

		matches.forEach(({ placeholder, content }) => {
			doc = doc.replace(placeholder, content);
		});

		editor.setValue(doc);
	}

	private addMobileUI(): void {
		const mobileToolbar = this.addStatusBarItem();
		const encryptButton = mobileToolbar.createEl('button', {
			text: '🔒',
			cls: 'mobile-encrypt-button'
		});
		const decryptButton = mobileToolbar.createEl('button', {
			text: '🔓',
			cls: 'mobile-decrypt-button'
		});

		encryptButton.addEventListener('click', () => {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView && activeView.editor) {
				this.makeSecret(activeView.editor);
			}
		});

		decryptButton.addEventListener('click', () => {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView && activeView.editor) {
				this.editorDecrypt(activeView.editor);
			}
		});
	}

	onunload(): void {
		console.log(`${PLUGIN_NAME} unloaded`);
	}
}
