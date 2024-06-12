import { App, editorLivePreviewField } from 'obsidian';
import { EditorView, ViewUpdate, Decoration, DecorationSet, ViewPlugin } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { SecretButtonWidget } from './SecretButtonWidget';

export const makeViewPlugin = (app: App, prefix: string, button_text: string, button_class: string) => ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.createDecorations(view);
  }

  update(update: ViewUpdate): void {
    if (!update.state.field(editorLivePreviewField)) {
      this.decorations = Decoration.none;
      return;
    }
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.decorations = this.createDecorations(update.view);
    }
  }

  private createDecorations(view: EditorView): DecorationSet {
    if (!view.state.field(editorLivePreviewField)) return Decoration.none;

    const builder = new RangeSetBuilder<Decoration>();
    const selection = view.state.selection;

    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter(node: Node) {
          if (node.type.name.startsWith("inline-code")) {
            const value = view.state.doc.sliceString(node.from, node.to)
            if(value.startsWith(prefix)){
              if(!selection.ranges.some(range => range.from <= node.to + 1 && range.to >= node.from - 1)){
                const encryptedText = value.slice(prefix.length);
                builder.add(
                  node.from,
                  node.to,
                  Decoration.replace({
                    widget: new SecretButtonWidget(app, encryptedText, button_text, button_class)
                  })
                );
              }
            }
          }
        },
      });
    }
    return builder.finish();
  }
}, {
  decorations: v => v.decorations,
});

