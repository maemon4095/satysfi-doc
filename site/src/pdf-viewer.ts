import { LitElement, PropertyValueMap, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { until } from 'lit/directives/until.js';
import * as PDF from "pdfjs-dist";
import { repeat, join, ParseResult, optional } from "./parser";

type Direction = "row" | "row-reverse" | "column" | "column-reverse";
type Axis = "width" | "height";

PDF.GlobalWorkerOptions.workerSrc =
    "node_modules/pdfjs-dist/build/pdf.worker.js";

//先にroot要素のみをrenderし，初回アップデートでResizeObserverつけて，サイズが確定したらpdfのレンダーという感じか．pdfはsrcをリアクティブにして，ロードを開始しつつキャッシュ．

@customElement("pdf-viewer")
export class PdfViewer extends LitElement {
    static styles = css`
        #root {
            min-width: 0px;
            min-heght: 0px;
            overflow: hidden;
            display: flex;
            align-items: center;
            gap: 1em;
        }

        canvas {
            min-width: 0px;
            min-height: 0px;
            position: relative;
        }
    `;

    #src: string | URL | ArrayBuffer | Uint8Array | undefined;
    set src(value: string | URL | ArrayBuffer | Uint8Array | undefined) {
        const old = this.#src;
        this.#src = value;
        if (value === undefined) {
            this.#documentTask = undefined;
        } else {
            this.#documentTask = PDF.getDocument(value);
        }

        this.requestUpdate('src', old);
    }
    @property()
    get src(): string | URL | ArrayBuffer | Uint8Array | undefined {
        return this.#src;
    }


    #ranges: Range[] = [{ left: null, right: null }];
    #rawRange: string = "..";
    set range(value: string) {
        const old = this.#rawRange;
        this.#rawRange = value;
        const ranges = parseRange(value);
        if (ranges !== null) {
            this.#ranges = ranges;
        } else {
            this.#ranges = [{ left: null, right: null }];
        }

        this.requestUpdate('range', old);
    }
    @property()
    get range(): string {
        return this.#rawRange;
    }

    #direction: Direction = "column";
    set direction(v: Direction) {
        const old = this.#direction;
        this.#direction = v;

        switch (this.direction) {
            case 'row':
            case 'row-reverse': {
                this.#mainAxis = "width";
                this.#crossAxis = "height";
                break;
            }
            case 'column':
            case 'column-reverse': {
                this.#mainAxis = "height";
                this.#crossAxis = "width";
                break;
            };
        }

        this.requestUpdate('direction', old);
    }

    @property()
    get direction(): Direction {
        return this.#direction;
    }

    #mainAxis: Axis = "height";
    #crossAxis: Axis = "width";

    #documentTask: PDF.PDFDocumentLoadingTask | undefined;

    render() {
        const contentsPromise = this.#documentTask?.promise.then(async pdf => {
            const pagenums = rangesToPageNums(this.#ranges, pdf.numPages);
            return html`${Array.from(pagenums, (i) => html`<canvas id='page_${i}' data-page='${i}'></canvas>`)}`;
        });

        const contents = until(contentsPromise, html`<span>Loading...</span>`);

        return html`
            <div id='root' style='flex-direction: ${this.direction};'>
                ${contents}
            </div>
        `;
    }

    protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        const docPromise = this.#documentTask?.promise;
        if (docPromise === undefined) {
            return;
        }
        (async () => {
            const doc = await docPromise;
            const pagenums = rangesToPageNums(this.#ranges, doc.numPages);
            console.log(pagenums);
            const pages = await Promise.all(Array.from(pagenums, async (i) => await doc.getPage(i)));
            const mainAxis = this.#mainAxis;
            const crossAxis = this.#crossAxis;

            const size = pages.reduce((sum, now) => {
                const v = now.getViewport({ scale: 1 });
                console.log('viewport', v);
                return {
                    [crossAxis]: Math.max(sum[crossAxis], v[crossAxis]),
                    [mainAxis]: sum[mainAxis] + v[mainAxis]
                };
            }, { [mainAxis]: 0, [crossAxis]: 0 });

            const root = this.renderRoot.querySelector('#root') as HTMLElement;
            const desiredWidth = root.clientWidth;
            const desiredHeight = root.clientHeight;


            let scale = desiredHeight / desiredWidth > size.heght / size.width
                ? desiredWidth / size.width
                : desiredHeight / size.heght;

            if (Number.isNaN(scale)) {
                scale = 1;
            }

            await Promise.all(Array.from(pages, (page) => {
                const viewport = page.getViewport({ scale });
                const canvas = this.renderRoot.querySelector(`#page_${page.pageNumber}`) as HTMLCanvasElement;
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const canvasContext = canvas.getContext('2d')!;

                const task = page.render({ canvasContext, viewport });
                return task.promise;
            }));
        })();
    }
}

type Range = { left: number | null, right: number | null; };


function rangesToPageNums(ranges: Range[], boundary: number): Iterable<number> {
    const pagenums = new Set<number>();
    for (const r of ranges) {
        let left = r.left ?? 1;
        let right = r.right ?? boundary;

        if (left < 1) {
            console.error('page range should greater than 0');
            left = 1;
        }
        if (right > boundary) {
            console.error('page range should less than or equal to document page num');
            right = boundary;
        }

        for (let i = left; i <= right; i++) {
            pagenums.add(i);
        }
    }
    return pagenums;
}

// comma separated range patterns.
// range ::= integer | interger '..' | integer '..' integer | '..' | '..' integer;
// patterns ::= spaces (range spaces ',' spaces)* range spaces [',' spaces];
function parseRange(str: string): Range[] | null {
    const result = join(spaces, repeat(join(range, spaces, commaToken, spaces)), range, spaces, optional(join(commaToken, spaces)))(str);
    if (result === null) {
        return null;
    }
    const [_leadingTrivia, repeatResult, lastRange] = result.value;

    const ranges = Array.from(repeatResult, ([r]) => r);
    ranges.push(lastRange);
    return ranges;


    function range(str: string): ParseResult<Range> | null {
        const left = int(str);
        if (left !== null) {
            // Left Closed Range or Degenerated Range
            const range = rangeToken(left.rest);
            if (range === null) {
                // Degenerated Range
                return { value: { left: left.value, right: left.value }, rest: left.rest };
            } else {
                // Left Closed Range or Closed Range
                const right = int(range.rest);
                if (right === null) {
                    // Left Closed Range
                    return { value: { left: left.value, right: null }, rest: range.rest };
                } else {
                    // Closed Range
                    return { value: { left: left.value, right: right.value }, rest: right.rest };
                }
            }
        } else {
            // Right Closed Range or Unbound Range
            const range = rangeToken(str);
            if (range === null) {
                // Not Range
                return null;
            }

            const right = int(range.rest);
            if (right === null) {
                // Unbound Range
                return { value: { left: null, right: null }, rest: range.rest };
            } else {
                // Right Closed Range
                return { value: { left: null, right: right.value }, rest: right.rest };
            }
        }
    }


    function commaToken(str: string): ParseResult<","> | null {
        const pattern = /^,/;
        const match = pattern.exec(str);
        if (match === null) {
            return null;
        }

        const token = match[0];

        return { value: token as ",", rest: str.substring(token.length) };
    }

    function rangeToken(str: string): ParseResult<".."> | null {
        const pattern = /^\.\./;
        const match = pattern.exec(str);
        if (match === null) {
            return null;
        }
        const token = match[0];
        return {
            value: token as "..",
            rest: str.substring(token.length)
        };
    }

    function spaces(str: string): ParseResult<string> {
        const pattern = /^\s+/;
        const match = pattern.exec(str);
        if (match === null) {
            return { value: "", rest: str };
        }

        const blanks = match[0];

        return { value: blanks, rest: str.substring(blanks.length) };
    }

    function int(str: string): ParseResult<number> | null {
        const pattern = /^[0-9]+/;

        const match = pattern.exec(str);
        if (match === null) {
            return null;
        }
        const intText = match[0];
        return { value: parseInt(intText), rest: str.substring(intText.length) };
    }
}

