"""Static check: for every `from app.X import name` in the codebase, confirm
`name` is actually defined (or re-exported) in module X. This is exactly the
class of bug that broke the original main.py (`from app.database import
client` when nothing in that package exposed `client`), and it works without
installing any third-party packages.
"""

import ast
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / "app"


def module_path_for(dotted: str) -> pathlib.Path | None:
    parts = dotted.split(".")
    if parts[0] != "app":
        return None
    rel = pathlib.Path(*parts[1:]) if len(parts) > 1 else pathlib.Path(".")
    candidate_pkg = APP / rel / "__init__.py"
    candidate_mod = APP / rel.with_suffix(".py") if len(parts) > 1 else None
    if candidate_pkg.exists():
        return candidate_pkg
    if candidate_mod is not None and candidate_mod.exists():
        return candidate_mod
    return None


def top_level_names(path: pathlib.Path) -> set[str]:
    tree = ast.parse(path.read_text(), filename=str(path))
    names: set[str] = set()
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            names.add(node.name)
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    names.add(target.id)
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            names.add(node.target.id)
        elif isinstance(node, ast.ImportFrom):
            for alias in node.names:
                names.add(alias.asname or alias.name)
        elif isinstance(node, ast.Import):
            for alias in node.names:
                names.add((alias.asname or alias.name).split(".")[0])
    return names


def main() -> int:
    problems = []
    checked = 0

    for py_file in sorted(APP.rglob("*.py")):
        tree = ast.parse(py_file.read_text(), filename=str(py_file))
        for node in ast.walk(tree):
            if not isinstance(node, ast.ImportFrom) or node.module is None:
                continue
            if not node.module.startswith("app"):
                continue
            target_path = module_path_for(node.module)
            if target_path is None:
                problems.append(f"{py_file.relative_to(ROOT)}: cannot resolve module `{node.module}`")
                continue
            available = top_level_names(target_path)
            # `from package import submodule` is valid even if `submodule`
            # isn't a name bound inside package/__init__.py -- it just needs
            # to exist as package/submodule.py or package/submodule/.
            if target_path.name == "__init__.py":
                pkg_dir = target_path.parent
                for alias in node.names:
                    if (pkg_dir / f"{alias.name}.py").exists() or (pkg_dir / alias.name / "__init__.py").exists():
                        available.add(alias.name)
            for alias in node.names:
                checked += 1
                if alias.name == "*":
                    continue
                if alias.name not in available:
                    problems.append(
                        f"{py_file.relative_to(ROOT)}: `from {node.module} import {alias.name}` "
                        f"-- `{alias.name}` is not defined in {target_path.relative_to(ROOT)}"
                    )

    print(f"Checked {checked} local `app.*` import(s) across {len(list(APP.rglob('*.py')))} files.")
    if problems:
        print(f"\n{len(problems)} problem(s) found:")
        for p in problems:
            print(f"  - {p}")
        return 1
    print("No unresolved local imports.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
