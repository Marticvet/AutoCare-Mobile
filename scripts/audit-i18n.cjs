const childProcess = require("child_process");
const fs = require("fs");
const ts = require("typescript");

const files = childProcess
    .execFileSync("rg", ["--files", "src/Screens/v2", "src/components"], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter((file) => file.endsWith(".tsx"))
    .concat([
        "src/Screens/LoginScreen.tsx",
        "src/Screens/RegisterScreen.tsx",
        "src/Screens/ForgotPasswordScreen.tsx",
        "src/Screens/ResetPasswordScreen.tsx",
        "App.tsx",
    ]);
const visiblePropertyNames = new Set([
    "accessibilityLabel",
    "action",
    "body",
    "description",
    "hint",
    "label",
    "placeholder",
    "subtitle",
    "text",
    "title",
]);

for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const report = (node, value) => {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        process.stdout.write(`${file}:${line}: ${value.replace(/\s+/g, " ").trim()}\n`);
    };

    const visit = (node) => {
        if (ts.isJsxText(node)) {
            const value = node.text.trim();
            if (/[A-Za-zÀ-ÿ]/.test(value)) report(node, value);
        }

        if (ts.isStringLiteralLike(node) && /[A-Za-zÀ-ÿ]/.test(node.text)) {
            let show = false;
            if (ts.isJsxAttribute(node.parent)) {
                show = visiblePropertyNames.has(node.parent.name.getText(sourceFile));
            }
            if (
                ts.isPropertyAssignment(node.parent)
                && visiblePropertyNames.has(node.parent.name.getText(sourceFile).replace(/["'`]/g, ""))
            ) show = true;
            if (
                (ts.isCallExpression(node.parent) || ts.isNewExpression(node.parent))
                && node.parent.arguments?.includes(node)
            ) {
                const callee = node.parent.expression.getText(sourceFile);
                if (callee === "Alert.alert" || callee === "Error") show = true;
            }

            for (let ancestor = node.parent; ancestor && !ts.isSourceFile(ancestor); ancestor = ancestor.parent) {
                if (ts.isImportDeclaration(ancestor)) {
                    show = false;
                    break;
                }
                if (ts.isCallExpression(ancestor) && ancestor.expression.getText(sourceFile) === "t") {
                    show = false;
                    break;
                }
            }
            if (show) report(node, node.text);
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
}
