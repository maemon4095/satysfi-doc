export type Defined<T> = T extends undefined ? never : T;
export type RecursiveRequired<T> = {
    [P in keyof Defined<T>]-?: RecursiveRequired<Defined<T>[P]>
} & Defined<T>;

export type Optional<T> = {
    [P in keyof T]?: Optional<T[P]>
} | undefined;

export function coalesce<T>(value: Optional<T>, defaults: T): T {
    if (value === undefined || value === null) {
        return defaults;
    }
    if (defaults === undefined || defaults === null) {
        return value as T;
    }

    if (Object.getPrototypeOf(defaults) !== Object.prototype) {
        if (value !== null || value !== undefined) {
            return value as T;
        }
        return defaults;
    }
    const obj: Partial<T> = {};
    const keys = getOwnKeysOf(defaults);
    for (const key of keys) {
        if (obj[key as any] !== undefined) {
            continue;
        }
        obj[key as any] = coalesce(value[key as any], defaults[key]);
    }
    return obj as T;
}

function getOwnKeysOf<T>(obj: T): (keyof T)[] {
    if (obj === null || obj === undefined) {
        return [];
    }
    const symbols = Object.getOwnPropertySymbols(obj) as (keyof T)[];
    const propNames = Object.getOwnPropertyNames(obj) as (keyof T)[];
    return symbols.concat(...propNames);
}