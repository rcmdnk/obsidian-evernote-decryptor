import { App, Modal, Notice, Setting } from 'obsidian';

export class DecryptedTextModal extends Modal {
  private decryptedText: string;

  constructor(app: App, decryptedText: string) {
    super(app);
    this.decryptedText = decryptedText;
  }

  onOpen(): void {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: 'Decrypted Text' });
    const textArea = contentEl.createEl('textarea');
    textArea.value = this.decryptedText;
    textArea.style.width = '100%';
    textArea.style.height = 'auto';
    textArea.style.overflow = 'hidden';
    textArea.readOnly = true;

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText('Copy to Clipboard & Close')
        .setCta()
        .onClick(() => {
          navigator.clipboard.writeText(this.decryptedText);
          this.close();
          new Notice('Copied to clipboard');
        }));
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
