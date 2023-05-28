import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { until } from 'lit/directives/until.js';
import * as PDF from "pdfjs-dist";

@customElement("pdf-viewer")
export class PdfViewer extends LitElement {
    static styles = css``;

    @property()
    src: String | URL | ArrayBuffer | Uint8Array = "";

    @property()
    range: String = "..";

    render() {
        const pdfTask = PDF.getDocument(this.src);

        const contentsPromise = pdfTask.promise.then(pdf => {
            return html``;
        });

        const result = until(contentsPromise, html`<span>Loading...</span>`);

        return html`<div>${result}</div>`;
    }
}