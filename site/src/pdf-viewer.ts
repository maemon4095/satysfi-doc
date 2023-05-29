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
            Array.from({ length: pdf.numPages }, async (_, i) => {
                const page = await pdf.getPage(i + 1);

            });
            return html``;
        });

        const result = until(contentsPromise, html`<span>Loading...</span>`);

        return html`<div>${result}</div>`;
    }
}

// comma separated range patterns.
// range ::= interger '..' | '..' integer | integer '..' integer | '..' | integer;
// patterns ::= spaces (range spaces ',' spaces)* range spaces [',' spaces];
function parseRange(str: string) {
    const ranges = [];
    int(str);

    type Parser<T> = (str: string) => [T, string] | null;
    type AlwaysParser<T> = (str: string) => [T, string];
    type ResultOf<P extends Parser<any>> = P extends Parser<infer X> ? X : never;

    type ResultsOf<A extends Parser<any>[]> = { [P in keyof A]: ResultOf<A[P]> } & { length: A['length']; };



    function join<Ps extends Parser<any>[]>(...fs: Ps): Parser<ResultsOf<Ps>> {
        return (str) => {
            const results = [];

            for (const f of fs) {
                const result = f(str);
                if (result === null) {
                    return null;
                }

                results.push(result[0]);
                str = result[1];
            }

            return results as ResultsOf<Ps>;
        };
    }

    function repeat<T>(f: Parser<T>): AlwaysParser<T[]> {
        return (str) => {
            const results: T[] = [];

            while (true) {
                const result = f(str);
                if (result == null) {
                    break;
                }
                results.push(result[0]);
                str = result[1];
            }

            return [results, str];
        };
    }

    function commaToken(str: string): [string, string] | null {
        const pattern = /^,/;
        const match = pattern.exec(str);
        if (match === null) {
            return null;
        }

        const token = match[0];

        return [token, str.substring(token.length)];
    }

    function rangeToken(str: string): [string, string] | null {
        const pattern = /^\.\./;
        const match = pattern.exec(str);
        if (match === null) {
            return null;
        }
        const token = match[0];
        return [token, str.substring(token.length)];
    }

    function spaces(str: string): [string, string] {
        const pattern = /^\s+/;
        const match = pattern.exec(str);
        if (match === null) {
            return ["", str];
        }

        const blanks = match[0];

        return [blanks, str.substring(blanks.length)];
    }

    function int(str: string): [number, string] | null {
        const pattern = /^[0-9]+/;

        const match = pattern.exec(str);
        if (match === null) {
            return null;
        }
        const intText = match[0];
        return [parseInt(intText), str.substring(intText.length)];
    }
}

