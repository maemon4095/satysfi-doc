import { basename, resolve, join, relative } from 'path';
import { build, defineConfig } from 'vite';
import template from "./plugin/template";
import * as fs from 'fs';
import { coalesce } from './plugin/coalesce';

type Directory = { [name: string]: Entry; };
type Entry = string | Directory;
type FindFilter = RegExp | ((str: string) => boolean);
type FindOptions = {
    base?: string | undefined,
    filter?: {
        include: FindFilter,
        exclude?: FindFilter,
    },
};

function find(root: string, options?: FindOptions): Entry | null {
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
        const p = join(root, f.path ?? "", f.name);
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
const target = find('public/artifacts', {
    base: "public",
    filter: {
        include: /\.pdf$/
    }
});
function displayDir(target: Directory): string {
    return `
    <div class="dir">
        <span>doc/</span>
        <ul>
        ${impl(target)}
        </ul>
    </div>`;

    function impl(target: Directory) {
        let contents = "";
        for (const [name, entry] of Object.entries(target)) {
            if (typeof entry === "string") {
                contents += `<li><a href="/pdfjs/web/viewer.html?file=/${entry}">${name}</a></li>`;
            } else {
                contents += `<li class="dir">
                    <span>${name}/</span>
                    <ul>${impl(entry)}</ul>
                </li>`;
            }
        }
        return contents;
    }
}


export default defineConfig({
    root: resolve(__dirname, 'root'),
    publicDir: "../public",
    build: {
        outDir: "../dist"
    },
    plugins: [
        template({
            evaluate(expr: string) {
                if (expr === "artifacts") {
                    return displayDir(target as Directory);
                }
            }
        })
    ]
});