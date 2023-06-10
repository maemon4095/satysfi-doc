import { Directory, find } from "./plugin/find";
import template from "./plugin/template";
import { resolve } from 'path';
import { ResolvedConfig, defineConfig } from 'vite';

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
                contents += `<li><a href="pdfjs/web/viewer.html?file=/${entry}">${name}</a></li>`;
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
        outDir: "../dist",
        emptyOutDir: true
    },
    plugins: [
        template((() => {
            let config: ResolvedConfig;
            return {
                onConfigResolved(resolvedConfig) {
                    config = resolvedConfig;
                },
                evaluate(expr) {
                    switch (expr) {
                        case "artifacts":
                            return displayDir(target as Directory);
                        case "base":
                            return config.base;
                    }
                },
            };
        })())
    ]
});