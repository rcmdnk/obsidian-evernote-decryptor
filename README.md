# Evernote Decryptor Plugin for Obsidian

When you import notes from Evernote by [importer plugin](https://github.com/obsidianmd/obsidian-importer),
encrypted data in Evernote is imported as a text.

This plugin provides commands to decrypt the encrypted data in the imported notes.

You can format the encrypted data as an Evernote Secret button format,
which can be decrypted by clicking the button.

It also provides a command to encrypt the selected text as Evernote secret format.

A decryption method is based on the article: [Decoding the Evernote en-crypt field payload](https://soundly.me/decoding-the-Evernote-en-crypt-field-payload/).

# Features

Following commands will be added:

- **Decrypt Evernote encrypted data**: Decrypt Evernote the selected encrypted text by entering the password and show the decrypted text.

![decrypt](https://github.com/rcmdnk/obsidian-evernote-decryptor/blob/master/images/decrypt.gif?raw=true)

- **Decrypt Evernote encrypted data and replace**: Decrypt Evernote the selected encrypted text and replace the text with the decrypted text.

![replace](https://github.com/rcmdnk/obsidian-evernote-decryptor/blob/master/images/replace.gif?raw=true)

- **Encrypt data as Evernote secret**: Encrypt the selected text using a password and replace the text with the encrypted data.

![encrypt](https://github.com/rcmdnk/obsidian-evernote-decryptor/blob/master/images/encrypt.gif?raw=true)

- **Format Evernote secret**: Format the selected encrypted text as Evernote secret format.

![format](https://github.com/rcmdnk/obsidian-evernote-decryptor/blob/master/images/format.gif?raw=true)

These command can be run from the right click context menu in the editor, too.

Evernote secret format is a inline-code block starting with `evernote_secret `.

```markdown
My secret is `evernote_secret <encrypted data>`.
```

This formatted text is viewed as a button of `Evernote Secret` in both reading and live preview mode.

By clicking the button, the password input dialog will be shown and the decrypted text will be displayed in a modal.

![button](https://github.com/rcmdnk/obsidian-evernote-decryptor/blob/master/images/button.gif?raw=true)

You can directly edit the encrypted text as a inline-code block, too.

![edit](https://github.com/rcmdnk/obsidian-evernote-decryptor/blob/master/images/edit.gif?raw=true)


## Settings

The plugin provides a settings tab under the Obsidian settings menu:

- **Show Editor Context Menu Item**: Toggle the display of the editor context menu items.

## Note

This plugin is inspired by the [inline-encrypter](https://github.com/solargate/obsidian-inline-encrypter),
which is a plugin for encrypting text in Obsidian.
