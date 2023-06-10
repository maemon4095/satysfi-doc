import { ResolvedConfig } from "vite";
type RegexMatchesWithIndices = RegExpExecArray & { indices: Array<[number, number]>; };
type Options = {
    order?: 'pre' | 'post',
    evaluate(expr: string): string | null | undefined;
    onConfigResolved?: (resolvedConfig: ResolvedConfig) => void;
};

export default function plugin(options: Options) {
    const staging: any = {};

    if (options.onConfigResolved !== undefined) {
        const process = options.onConfigResolved;
        staging.configResolved = (resolvedConfig: ResolvedConfig) => {
            process(resolvedConfig);
        };
    }

    return {
        order: options.order,
        name: "template",
        ...staging,
        transformIndexHtml: (src: string) => {
            const evaluate = options.evaluate;
            const pattern = /(?<esc>\\?)\${{(?<expr>.*?)}}/gds;

            let transformed = "";
            let last = 0;
            while (true) {
                const match = pattern.exec(src) as RegexMatchesWithIndices | null;
                if (match === null) break;
                const [[start, end]] = match.indices;
                if (start > last) {
                    transformed += src.substring(last, start);
                }
                if (match.groups?.["esc"] === "") {
                    const expr = match.groups?.["expr"] ?? "";
                    const t = evaluate(expr);
                    if (!(t === undefined || t === null)) {
                        transformed += t;
                    }
                } else {
                    transformed += match[0].substring(1);
                }
                last = end;
            }

            transformed += src.substring(last);

            return transformed;
        }
    };
}