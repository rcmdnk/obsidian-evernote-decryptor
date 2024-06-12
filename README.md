# Evernote Decryptor Plugin for Obsidian

Manage encrypted data imported from Evernote.

A decryption method is based on the article: [Decoding the Evernote en-crypt field payload](https://soundly.me/decoding-the-Evernote-en-crypt-field-payload/).

# Features

Following commands will be added:

- **Decrypt Evernote encrypted data**: Decrypt Evernote the selected encrypted text by entering the password and show the decrypted text.
- **Decrypt Evernote encrypted data and replace**: Decrypt Evernote the selected encrypted text and replace the text with the decrypted text.
- **Encrypt data as Evernote secret**: Encrypt the selected text using a password and replace the text with the encrypted data.
- **Format Evernote secret**: Format the selected encrypted text as Evernote secret format.

These command can be run from the right click context menu in the editor, too.

Evernote secret format is a inline-code block starting with `evernote_secret `.

```markdown
My secret is `evernote_secret <encrypted data>`.
```

This formatted text is viewed as a button of `Evernote Secret` in both reading and live preview mode.

By clicking the button, the password input dialog will be shown and the decrypted text will be displayed in a modal.

## Settings

The plugin provides a settings tab under the Obsidian settings menu:

- **Show Editor Context Menu Item**: Toggle the display of the editor context menu items.

## Note

This plugin is inspired by the [inline-encrypter](https://github.com/solargate/obsidian-inline-encrypter),
which is a plugin for encrypting text in Obsidian.
