import * as fs from 'fs';
import { coalesce } from './coalesce';
import { join, relative } from 'path';


export type Directory = { [name: string]: Entry; };
export type Entry = string | Directory;
export type FindFilter = RegExp | ((str: string) => boolean);
export type FindOptions = {
    base?: string | undefined,
    filter?: {
        include: FindFilter,
        exclude?: FindFilter,
    },
};

export function find(root: string, options?: FindOptions): Entry | null {
    const { base, filter } = coalesce(options, {
        base: ".",
        filter: {
            include: ((_str: string) => true) as FindFilter,
            exclude: ((_str: string) => false) as FindFilter,
        }
    });
    if (fs.lstatSync(root).isFile()) {
        if (!matches(filter.include, root) || matches(filter.exclude, root)) {
            return null;
        }
        return relative(base, root);
    }
    const files = fs.readdirSync(root, { withFileTypes: true });
    return Object.fromEntries(files.flatMap((f) => {
        const p = join(root, f.name);
        const e = find(p, options);
        if (e === null) {
            return [];
        }
        return [[f.name, e]];
    }));

    function matches(filter: FindFilter, str: string): boolean {
        if (filter instanceof Function) {
            return filter(str);
        } else {
            return filter.test(str);
        }
    }
}