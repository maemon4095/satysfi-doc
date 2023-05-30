export type ParseResult<T> = { value: T, rest: string; };
export type NonEmptyArray<T> = [T, ...T[]];
export type Parser<T> = (str: string) => ParseResult<T> | null;
export type AlwaysParser<T> = (str: string) => ParseResult<T>;
export type Map2Parsers<A extends NonEmptyArray<any>> = { [P in keyof A]: Parser<A[P]> } & { length: A['length']; } & Parser<any>[];


export function optional<T>(f: Parser<T>): Parser<T | null> {
    return (str) => {
        const result = f(str);

        return result === null
            ? { value: null, rest: str }
            : { value: result.value, rest: result.rest };
    };
}

export function or<A extends NonEmptyArray<any>>(...fs: Map2Parsers<A>): Parser<A[number]> {
    return (str) => {
        for (const f of fs) {
            const result = f(str);
            if (result === null) {
                continue;
            }
            return result as { value: A[number]; rest: string; };
        }
        return null;
    };
}


export function join<A extends NonEmptyArray<any>>(...fs: Map2Parsers<A>): Parser<A> {
    return (str) => {
        const results: any[] = [];

        for (const f of fs) {
            const result = f(str);
            if (result === null) {
                return null;
            }

            results.push(result.value);
            str = result.rest;
        }

        return { value: results as A, rest: str };
    };
}

export function repeat<T>(f: Parser<T>): AlwaysParser<T[]> {
    return (str) => {
        const results: T[] = [];

        while (true) {
            const result = f(str);
            if (result == null) {
                break;
            }
            results.push(result.value);
            str = result.rest;
        }

        return { value: results, rest: str };
    };
}
