import { Modal, Setting, App } from 'obsidian';

export class PasswordModal extends Modal {
	private onSubmit: (password: string) => void;
	private passwordField: HTMLInputElement;

	constructor(app: App, onSubmit: (password: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: 'Enter Evernote encryption password.' });
		new Setting(contentEl)
		.setName('Password')
		.addText(text => {
			this.passwordField = text.inputEl;
			this.passwordField.type = 'password';
			this.passwordField.addEventListener('keypress', (e: KeyboardEvent) => {
				if (e.key === 'Enter') {
					this.onPasswordSubmit();
				}
			});
		});

		new Setting(contentEl)
		.addButton(btn => btn
				.setButtonText('Submit')
				.setCta()
				.onClick(() => {
					this.onPasswordSubmit();
				}));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private onPasswordSubmit() {
		this.onSubmit(this.passwordField.value);
		this.close();
	}
}
