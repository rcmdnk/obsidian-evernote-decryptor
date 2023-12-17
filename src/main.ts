import { Plugin, Notice, Editor, Menu } from 'obsidian';
import { PasswordModal } from 'PasswordModal';
import { decryptText } from 'CryptoUtils';

export default class CustomContextMenuPlugin extends Plugin {
	onload() {
		this.addCommand({
			id: 'decrypt-evernote-encrypted-data',
			name: 'Decrypt Evernote encrypted data',
			editorCallback: (editor: Editor) => this.evernoteDecrypt(editor)
		});

		this.registerEvent(this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
			menu.addItem(item => {
				item.setTitle('Decrypt Evernote encrypted data')
				.onClick(() => this.evernoteDecrypt(editor));
			});
		}));
	}

	evernoteDecrypt(editor: Editor): void {
		const modal = new PasswordModal(this.app, password => {
			if (password.trim() === '') {
				new Notice('⚠️  Please enter a password.', 10000);
				return;
			}

			try {
				const selectedText = editor.getSelection();
				const decryptedText = decryptText(selectedText, password);
				editor.replaceSelection(decryptedText);
			} catch (error) {
				new Notice('❌ Failed to decrypt.', 10000);
				new Notice(error);
			}
		});

		modal.open();
	}
}
