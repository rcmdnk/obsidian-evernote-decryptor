import { App, Modal, Setting } from 'obsidian';

export class PasswordModal extends Modal {
	private onSubmit: (password: string) => void;
	private passwordField: HTMLInputElement;

	constructor(app: App, onSubmit: (password: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Enter Evernote encryption password.' });
		this.createPasswordField(contentEl);
		this.createSubmitButton(contentEl);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private createPasswordField(contentEl: HTMLElement) {
		new Setting(contentEl)
			.setName('Password')
			.addText(text => {
				this.passwordField = text.inputEl;
				this.passwordField.type = 'password';
				this.passwordField.addEventListener('keypress', (e: KeyboardEvent) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						this.onPasswordSubmit();
					}
				});
			});
	}

	private createSubmitButton(contentEl: HTMLElement) {
		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('Submit')
				.setCta()
				.onClick(() => {
					this.onPasswordSubmit();
				}));
	}

	private onPasswordSubmit() {
		this.onSubmit(this.passwordField.value);
		this.close();
	}
}

export function openPasswordModal(app: App): Promise<string> {
	return new Promise((resolve) => {
		new PasswordModal(app, resolve).open();
	});
}

