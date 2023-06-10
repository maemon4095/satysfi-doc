import { coalesce, Optional, } from "./coalesce";
type RegexMatchesWithIndices = RegExpExecArray & { indices: Array<[number, number]>; };
type Options = {
    evaluate(expr: string): string | null | undefined;
};

export default function plugin(options: Optional<Options>) {
    const { evaluate } = coalesce(
        options,
        {
            evaluate(expr: string) { }
        }
    );

    return {
        name: "template",
        transformIndexHtml: (src: string) => {
            const pattern = /\${{(?<expr>.*?)}}/gds;

            let transformed = "";
            let last = 0;
            while (true) {
                const match = pattern.exec(src) as RegexMatchesWithIndices | null;
                if (match === null) break;
                const [[start, end]] = match.indices;
                if (start > last) {
                    transformed += src.substring(last, start - 1 /* 仕様と異なり端を含む */);
                }
                const expr = match.groups?.["expr"] ?? "";
                const t = evaluate(expr);
                if (!(t === undefined || t === null)) {
                    transformed += t;
                }
                last = end;
            }

            transformed += src.substring(last);

            return transformed;
        }
    };
}