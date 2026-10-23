"""Pyodide-side bridge for TypeScript Playground VISUAL.

Records a Python run line by line with sys.settrace, converts values into a
tagged JSON structure, and returns TRACE-compatible steps to the JS side.

The Python source is never rewritten, so line numbers in steps and tracebacks
are the original source lines.
"""

import ast
import json
import math
import sys
import time
import types

FILENAME = "<py-playground>"
MAX_STEPS = 4000
MAX_DEPTH = 6
MAX_ITEMS = 40
MAX_STR = 240
NODE_BUDGET = 1200
DEFAULT_TIME_LIMIT = 8.0


class _StopTrace(BaseException):
    pass


class _TraceTimeout(BaseException):
    pass


def _safe_repr(value, limit=MAX_STR):
    try:
        text = repr(value)
    except Exception:
        text = "<%s>" % type(value).__name__
    return text if len(text) <= limit else text[: limit - 1] + "…"


def _is_dunder(name):
    return name.startswith("__") and name.endswith("__")


def _is_displayable(name, value):
    if _is_dunder(name):
        return False
    if name in ("checkpoint", "断点", "print"):
        return False
    if isinstance(value, (types.ModuleType, types.FunctionType, types.BuiltinFunctionType, type)):
        return False
    return True


_NON_INSTANCE_TYPES = (
    type(None),
    bool,
    int,
    float,
    str,
    bytes,
    bytearray,
    range,
    list,
    tuple,
    dict,
    set,
    frozenset,
    types.ModuleType,
    types.FunctionType,
    types.BuiltinFunctionType,
    types.MethodType,
    type,
)


def _is_user_instance(value):
    if isinstance(value, _NON_INSTANCE_TYPES):
        return False
    cls = type(value)
    mod = getattr(cls, "__module__", "")
    if mod in ("__main__", FILENAME):
        return True
    if mod == "builtins":
        return False
    return hasattr(value, "__dict__") or bool(getattr(cls, "__slots__", None))


def _fields_of_instance(value):
    fields = {}
    try:
        if hasattr(value, "__dict__"):
            for key, val in vars(value).items():
                if not _is_dunder(key):
                    fields[key] = val
    except Exception:
        pass
    slots = getattr(type(value), "__slots__", None)
    if slots:
        if isinstance(slots, str):
            slots = (slots,)
        for key in slots:
            if key in ("__dict__", "__weakref__"):
                continue
            try:
                fields[key] = getattr(value, key)
            except Exception:
                pass
    return fields


def _looks_like_object_dict(keys):
    key_set = set(keys)
    if "nodes" in key_set and "edges" in key_set:
        return True
    if "val" in key_set and ("left" in key_set or "right" in key_set or "next" in key_set):
        return True
    if "id" in key_set and ("label" in key_set or "name" in key_set):
        return True
    return False


def _numpy_array_to_list(value):
    try:
        if "numpy" not in sys.modules:
            return None
        np = sys.modules["numpy"]
        if isinstance(value, np.ndarray):
            if value.size <= 400:
                return value.tolist()
            return None
        if isinstance(value, np.generic):
            return value.item()
    except Exception:
        return None
    return None


_POINTER_NAMES = (
    "mid", "m", "i", "j", "k", "idx", "p", "q", "cur", "curr", "slow", "fast", "pivot",
    "l", "r", "left", "right", "lo", "hi", "low", "high", "start", "end",
)
_COORD_PAIRS = (("i", "j"), ("r", "c"), ("row", "col"), ("x", "y"))


def _extract_focus(local_vars):
    indices = []
    seen = set()
    for name in _POINTER_NAMES:
        val = local_vars.get(name)
        if type(val) is int and 0 <= val < 10**9 and val not in seen:
            seen.add(val)
            indices.append(val)
    coord = None
    for rk, ck in _COORD_PAIRS:
        rv = local_vars.get(rk)
        cv = local_vars.get(ck)
        if type(rv) is int and type(cv) is int and rv >= 0 and cv >= 0:
            coord = (rv, cv)
            break
    return {"indices": indices[:6], "coord": coord}


def _select_grid_axis(total, focus_idx, max_count=8):
    if total <= max_count:
        return list(range(total))
    chosen = {0, total - 1}
    center = focus_idx if (type(focus_idx) is int and 0 <= focus_idx < total) else 1
    inner_quota = max(2, max_count - 2)
    start = max(1, center - inner_quota // 2)
    end = min(total - 2, start + inner_quota - 1)
    start = max(1, end - inner_quota + 1)
    for idx in range(start, end + 1):
        chosen.add(idx)
    return sorted(chosen)


def _focal_1d_indices(total, focus_indices):
    if total <= 20:
        return []
    centers = [c for c in (focus_indices or []) if 0 <= c < total][:4]
    radius = 3 if len(centers) <= 1 else (2 if len(centers) == 2 else 1)
    chosen = set(range(0, min(total, 3))) | set(range(max(0, total - 3), total))
    for c in centers:
        for idx in range(max(0, c - radius), min(total, c + radius + 1)):
            chosen.add(idx)
    return sorted(chosen)


def _tag_value(value, depth=0, memo=None, budget=None, focus=None):
    if memo is None:
        memo = {}
    if budget is None:
        budget = [NODE_BUDGET]
    budget[0] -= 1
    if budget[0] < 0:
        return {"$t": "repr", "v": _safe_repr(value)}

    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        if abs(value) > 9007199254740991:
            return {"$t": "bigint", "v": str(value)}
        return value
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return {"$t": "float", "v": repr(value)}
        return value
    if isinstance(value, str):
        return value if len(value) <= MAX_STR else value[: MAX_STR - 1] + "…"
    if isinstance(value, (bytes, bytearray)):
        return {"$t": "repr", "v": _safe_repr(value)}

    numpy_list = _numpy_array_to_list(value)
    if numpy_list is not None:
        return _tag_value(numpy_list, depth, memo, budget, focus)

    if isinstance(value, range):
        try:
            total_len = len(value)
            if total_len <= MAX_ITEMS:
                return _tag_value(list(value), depth, memo, budget, focus)
            items = [_tag_value(value[idx], depth + 1, memo, budget) for idx in range(min(total_len, MAX_ITEMS))]
            res = {"$t": "seq", "id": len(memo) + 1, "cls": "range", "items": items, "total": total_len}
            if depth == 0 and total_len > 20:
                f_idxs = _focal_1d_indices(total_len, focus["indices"] if focus else None)
                res["sparse"] = [[i, _tag_value(value[i], depth + 1, memo, budget)] for i in f_idxs]
            return res
        except Exception:
            pass
        return {"$t": "repr", "v": _safe_repr(value)}

    if type(value).__module__ == "collections" and type(value).__name__ == "deque":
        return _tag_value(list(value), depth, memo, budget, focus)

    if isinstance(value, (list, tuple)):
        oid = id(value)
        if oid in memo:
            return {"$t": "ref", "id": memo[oid]}
        if depth >= MAX_DEPTH:
            return {"$t": "repr", "v": _safe_repr(value)}
        memo[oid] = len(memo) + 1
        node_id = memo[oid]
        total_len = len(value)
        items = []
        for idx in range(min(total_len, MAX_ITEMS)):
            items.append(_tag_value(value[idx], depth + 1, memo, budget))
        res = {
            "$t": "seq",
            "id": node_id,
            "cls": "tuple" if isinstance(value, tuple) else "list",
            "items": items,
            "total": total_len,
        }
        if depth == 0 and total_len > 0 and isinstance(value[0], (list, tuple)):
            total_cols = len(value[0])
            res["totalRows"] = total_len
            res["totalCols"] = total_cols
            if total_len > 10 or total_cols > 10:
                coord = focus["coord"] if focus else None
                focus_r = coord[0] if coord else None
                focus_c = coord[1] if coord else None
                r_idxs = _select_grid_axis(total_len, focus_r, 8)
                c_idxs = _select_grid_axis(total_cols, focus_c, 8)
                view_cells = []
                for r in r_idxs:
                    row_obj = value[r] if r < total_len and isinstance(value[r], (list, tuple)) else ()
                    view_cells.append([
                        _tag_value(row_obj[c], depth + 2, memo, budget) if c < len(row_obj) else None
                        for c in c_idxs
                    ])
                res["rowIndices"] = r_idxs
                res["colIndices"] = c_idxs
                res["viewCells"] = view_cells
        elif depth == 0 and total_len > 20:
            f_idxs = _focal_1d_indices(total_len, focus["indices"] if focus else None)
            res["sparse"] = [[i, _tag_value(value[i], depth + 1, memo, budget)] for i in f_idxs]
            if total_len > MAX_ITEMS:
                res["tail"] = [
                    _tag_value(value[i], depth + 1, memo, budget)
                    for i in range(max(0, total_len - 6), total_len)
                ]
        return res

    if isinstance(value, dict):
        oid = id(value)
        if oid in memo:
            return {"$t": "ref", "id": memo[oid]}
        if depth >= MAX_DEPTH:
            return {"$t": "repr", "v": _safe_repr(value)}
        memo[oid] = len(memo) + 1
        node_id = memo[oid]
        total_len = len(value)
        keys = []
        for idx, k in enumerate(value.keys()):
            if idx >= MAX_ITEMS:
                break
            keys.append(k)
        if keys and all(isinstance(k, str) for k in keys) and _looks_like_object_dict(keys):
            fields = {}
            for key in keys:
                fields[key] = _tag_value(value[key], depth + 1, memo, budget)
            return {"$t": "obj", "id": node_id, "cls": "dict", "fields": fields}
        entries = []
        for key in keys:
            tagged_key = key if isinstance(key, (str, int, float, bool)) else _safe_repr(key)
            entries.append([tagged_key, _tag_value(value[key], depth + 1, memo, budget)])
        return {"$t": "dict", "id": node_id, "cls": type(value).__name__, "entries": entries, "total": total_len}

    if isinstance(value, (set, frozenset)):
        oid = id(value)
        if oid in memo:
            return {"$t": "ref", "id": memo[oid]}
        if depth >= MAX_DEPTH:
            return {"$t": "repr", "v": _safe_repr(value)}
        memo[oid] = len(memo) + 1
        node_id = memo[oid]
        total_len = len(value)
        items = []
        for idx, item in enumerate(value):
            if idx >= MAX_ITEMS:
                break
            items.append(_tag_value(item, depth + 1, memo, budget))
        return {"$t": "set", "id": node_id, "cls": type(value).__name__, "items": items, "total": total_len}

    if isinstance(value, (types.ModuleType, types.FunctionType, types.BuiltinFunctionType, type)):
        return {"$t": "repr", "v": _safe_repr(value)}

    fields = _fields_of_instance(value)
    if fields or _is_user_instance(value):
        oid = id(value)
        if oid in memo:
            return {"$t": "ref", "id": memo[oid]}
        if depth >= MAX_DEPTH:
            return {"$t": "repr", "v": _safe_repr(value)}
        memo[oid] = len(memo) + 1
        node_id = memo[oid]
        tagged_fields = {}
        for idx, (key, val) in enumerate(fields.items()):
            if idx >= MAX_ITEMS:
                break
            tagged_fields[key] = _tag_value(val, depth + 1, memo, budget)
        return {"$t": "obj", "id": node_id, "cls": type(value).__name__, "fields": tagged_fields}

    return {"$t": "repr", "v": _safe_repr(value)}


def tag_value(value):
    return _tag_value(value)


def _format_value(value, depth=0, seen=None):
    if seen is None:
        seen = set()
    if value is None:
        return "None"
    if isinstance(value, bool):
        return "True" if value else "False"
    if isinstance(value, (int, float)):
        return repr(value)
    if isinstance(value, str):
        s = value if len(value) <= 120 else value[:119] + "…"
        return json.dumps(s, ensure_ascii=False)
    if _is_user_instance(value) and getattr(type(value), "__repr__", None) is object.__repr__:
        oid = id(value)
        if oid in seen:
            return "%s(…)" % type(value).__name__
        seen.add(oid)
        fields = _fields_of_instance(value)
        cls_name = type(value).__name__
        if ("val" in fields or "value" in fields) and ("left" in fields or "right" in fields):
            v = fields.get("val", fields.get("value"))
            return "Tree(%s)" % _format_value(v, depth + 1, seen)
        if ("val" in fields or "value" in fields) and "next" in fields:
            v = fields.get("val", fields.get("value"))
            return "List(%s)" % _format_value(v, depth + 1, seen)
        if depth >= 2:
            return "%s(…)" % cls_name
        parts = []
        for idx, (k, v) in enumerate(fields.items()):
            if idx >= 4:
                parts.append("…")
                break
            parts.append("%s=%s" % (k, _format_value(v, depth + 1, seen)))
        return "%s(%s)" % (cls_name, ", ".join(parts))
    if isinstance(value, (list, tuple)):
        if len(value) > 0 and isinstance(value[0], (list, tuple)):
            return "[%d×%d]" % (len(value), len(value[0]))
        head = [_format_value(value[i], depth + 1, seen) for i in range(min(len(value), 6))]
        if len(value) > 6:
            head.append("… (%d 项)" % len(value))
        br_l, br_r = ("(", ")") if isinstance(value, tuple) else ("[", "]")
        return br_l + ", ".join(head) + br_r
    if isinstance(value, dict):
        parts = []
        for idx, (k, v) in enumerate(value.items()):
            if idx >= 5:
                parts.append("… (%d 项)" % len(value))
                break
            parts.append("%s: %s" % (_format_value(k, depth + 1, seen), _format_value(v, depth + 1, seen)))
        return "{" + ", ".join(parts) + "}"
    if isinstance(value, (set, frozenset)):
        if not value:
            return "set()"
        parts = []
        for idx, item in enumerate(value):
            if idx >= 5:
                parts.append("… (%d 项)" % len(value))
                break
            parts.append(_format_value(item, depth + 1, seen))
        return "{" + ", ".join(parts) + "}"
    return _safe_repr(value, 400)


def _frame_label(frame):
    name = frame.f_code.co_name
    if name == "<module>":
        return "global"
    arg_count = frame.f_code.co_argcount
    arg_names = frame.f_code.co_varnames[:arg_count]
    parts = []
    for arg in arg_names:
        if arg in ("self", "cls"):
            continue
        if arg in frame.f_locals:
            parts.append(_format_value(frame.f_locals[arg]))
    return "%s(%s)" % (name, ", ".join(parts))


def _capture_locals(local_vars):
    out = {}
    for name, value in local_vars.items():
        if name == "self" and (_is_user_instance(value) or _fields_of_instance(value)):
            out["this"] = value
            continue
        if _is_displayable(name, value):
            out[name] = value
    return out


class _Recorder:
    def __init__(self, lines, max_steps=MAX_STEPS, time_limit=DEFAULT_TIME_LIMIT):
        self.lines = lines
        self.max_steps = max_steps
        self.time_limit = time_limit
        self.steps = []
        self.stdout = []
        self.started_at = None
        self.error = None
        self.error_line = None
        self.pending_checkpoint = None
        self.finished = False
        self.return_value = None

    def _note(self, line):
        if 1 <= line <= len(self.lines):
            text = self.lines[line - 1].strip()
            return text if len(text) <= 100 else text[:99] + "…"
        return ""

    def _check_limits(self):
        if self.started_at is None:
            self.started_at = time.monotonic()
        if len(self.steps) >= self.max_steps:
            raise _StopTrace()
        if len(self.steps) % 64 == 0 and time.monotonic() - self.started_at > self.time_limit:
            raise _TraceTimeout()

    def _stack_snapshot(self, frame, top_tagged=None):
        frames = []
        cursor = frame
        idx = 0
        while cursor is not None and cursor.f_code.co_filename == FILENAME:
            if idx == 0 and top_tagged is not None:
                tagged = top_tagged
            else:
                local_vars = _capture_locals(dict(cursor.f_locals))
                focus = _extract_focus(local_vars)
                tagged = {}
                budget = [max(300, NODE_BUDGET // 2)]
                for key, value in local_vars.items():
                    tagged[key] = _tag_value(value, 0, {}, budget, focus)
            frames.append({
                "id": idx,
                "fn": cursor.f_code.co_name,
                "label": _frame_label(cursor),
                "line": cursor.f_lineno,
                "vars": tagged,
            })
            cursor = cursor.f_back
            idx += 1
        frames.reverse()
        for idx, item in enumerate(frames):
            item["id"] = idx
        return frames

    def trace(self, frame, event, arg):
        if frame.f_code.co_filename != FILENAME:
            return self.trace
        if event == "line":
            try:
                self._check_limits()
            except _StopTrace:
                raise
            except _TraceTimeout:
                raise
            line = frame.f_lineno
            local_vars = _capture_locals(dict(frame.f_locals))
            focus = _extract_focus(local_vars)
            tagged = {}
            budget = [NODE_BUDGET * 2]
            for key, value in local_vars.items():
                tagged[key] = _tag_value(value, 0, {}, budget, focus)
            step = {
                "line": line,
                "note": self._note(line),
                "vars": tagged,
                "stack": self._stack_snapshot(frame, top_tagged=tagged),
                "isCheckpoint": False,
                "checkpointVals": None,
                "error": None,
            }
            if self.pending_checkpoint is not None:
                step["isCheckpoint"] = True
                step["checkpointVals"] = self.pending_checkpoint
                self.pending_checkpoint = None
            self.steps.append(step)
        return self.trace

    def checkpoint(self, *args):
        values = [_format_value(value) for value in args]
        if self.steps:
            self.steps[-1]["isCheckpoint"] = True
            self.steps[-1]["checkpointVals"] = values
        else:
            self.pending_checkpoint = values

    def print_fn(self, *args, **kwargs):
        sep = kwargs.get("sep", " ")
        end = kwargs.get("end", "\n")
        text = sep.join(_format_value(value) for value in args)
        if end != "\n":
            text += end
        self.stdout.append(text)


def check_syntax_json(src):
    try:
        compile(src, FILENAME, "exec")
        return json.dumps({"ok": True}, ensure_ascii=False)
    except SyntaxError as exc:
        return json.dumps({
            "ok": False,
            "line": exc.lineno or 1,
            "offset": exc.offset or 0,
            "msg": exc.msg,
            "text": exc.text or "",
        }, ensure_ascii=False)


def _find_call(src):
    for line_no, line in enumerate(src.splitlines(), 1):
        stripped = line.strip()
        if stripped.startswith("#") and "调用" in stripped:
            head, sep, tail = stripped.partition("：")
            if not sep:
                head, sep, tail = stripped.partition(":")
            if sep and tail.strip():
                return line_no, tail.strip()
    return None, None


def _extract_call(src):
    return _find_call(src)[1]


def _resolve_entry(tree, src):
    """Prefer a real call on the last top-level line; keep the legacy comment syntax."""
    line, expr = _find_call(src)
    if expr:
        return line, expr, tree
    if tree.body and isinstance(tree.body[-1], ast.Expr) and isinstance(tree.body[-1].value, ast.Call):
        node = tree.body[-1]
        expr = ast.get_source_segment(src, node.value) or ast.unparse(node.value)
        tree.body = tree.body[:-1]
        return node.lineno, expr, tree
    return None, None, tree


def _infer_ast_type(node, param_types=None):
    if node is None:
        return "any"
    if isinstance(node, ast.Constant):
        if node.value is None:
            return "any"
        if isinstance(node.value, bool):
            return "bool"
        if isinstance(node.value, int):
            return "int"
        if isinstance(node.value, float):
            return "float"
        if isinstance(node.value, str):
            return "str"
    if isinstance(node, ast.List):
        return "list"
    if isinstance(node, ast.Dict):
        return "dict"
    if isinstance(node, ast.Set):
        return "set"
    if isinstance(node, ast.Tuple):
        return "tuple"
    if isinstance(node, ast.Name) and param_types and node.id in param_types:
        return param_types[node.id]
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
        return node.func.id
    return "any"


def extract_meta_json(src):
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return json.dumps({"classes": [], "varTypes": {}, "declared": [], "imports": []}, ensure_ascii=False)
    classes = []
    var_types = {}
    declared = set()
    imports = set()
    class_names = {n.name for n in ast.walk(tree) if isinstance(n, ast.ClassDef)}
    class_body_ann_ids = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            field_map = {}
            for body in node.body:
                if isinstance(body, ast.AnnAssign) and isinstance(body.target, ast.Name):
                    class_body_ann_ids.add(id(body))
                    k = body.target.id
                    field_map[k] = {
                        "k": k,
                        "declaredType": ast.unparse(body.annotation),
                        "optional": False,
                    }
                elif isinstance(body, ast.Assign):
                    for target in body.targets:
                        if isinstance(target, ast.Name) and not _is_dunder(target.id):
                            field_map[target.id] = {
                                "k": target.id,
                                "declaredType": _infer_ast_type(body.value),
                                "optional": False,
                            }
                elif isinstance(body, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    param_types = {}
                    all_args = list(body.args.posonlyargs) + list(body.args.args) + list(body.args.kwonlyargs)
                    for arg in all_args:
                        if arg.annotation is not None:
                            param_types[arg.arg] = ast.unparse(arg.annotation)
                    for stmt in ast.walk(body):
                        if isinstance(stmt, ast.AnnAssign) and isinstance(stmt.target, ast.Attribute):
                            if isinstance(stmt.target.value, ast.Name) and stmt.target.value.id == "self":
                                k = stmt.target.attr
                                if not _is_dunder(k):
                                    field_map[k] = {
                                        "k": k,
                                        "declaredType": ast.unparse(stmt.annotation),
                                        "optional": False,
                                    }
                        elif isinstance(stmt, ast.Assign):
                            for target in stmt.targets:
                                if isinstance(target, ast.Attribute) and isinstance(target.value, ast.Name) and target.value.id == "self":
                                    k = target.attr
                                    if not _is_dunder(k) and k not in field_map:
                                        field_map[k] = {
                                            "k": k,
                                            "declaredType": _infer_ast_type(stmt.value, param_types),
                                            "optional": False,
                                        }
            classes.append({"name": node.name, "line": node.lineno, "isClass": True, "fields": list(field_map.values())})
            declared.add(node.name)
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            if id(node) not in class_body_ann_ids:
                var_types[node.target.id] = ast.unparse(node.annotation)
            declared.add(node.target.id)
        elif isinstance(node, ast.Assign):
            if isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Name) and node.value.func.id in class_names:
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id not in var_types:
                        var_types[target.id] = node.value.func.id
                        declared.add(target.id)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            declared.add(node.name)
            args = node.args
            for arg in list(args.posonlyargs) + list(args.args) + list(args.kwonlyargs):
                declared.add(arg.arg)
                if arg.annotation is not None and arg.arg not in var_types:
                    var_types[arg.arg] = ast.unparse(arg.annotation)
            if args.vararg:
                declared.add(args.vararg.arg)
            if args.kwarg:
                declared.add(args.kwarg.arg)
        elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
            declared.add(node.id)
        elif isinstance(node, ast.Import):
            for alias in node.names:
                imports.add(alias.name.split(".")[0])
                declared.add(alias.asname or alias.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imports.add(node.module.split(".")[0])
            for alias in node.names:
                declared.add(alias.asname or alias.name)
        elif isinstance(node, ast.For):
            for target in ast.walk(node.target):
                if isinstance(target, ast.Name):
                    declared.add(target.id)
        elif isinstance(node, ast.With):
            for item in node.items:
                if item.optional_vars:
                    for target in ast.walk(item.optional_vars):
                        if isinstance(target, ast.Name):
                            declared.add(target.id)
        elif isinstance(node, ast.ExceptHandler) and node.name:
            declared.add(node.name)
    return json.dumps({
        "classes": classes,
        "varTypes": var_types,
        "declared": sorted(declared),
        "imports": sorted(imports),
    }, ensure_ascii=False)


_NB_GLOBALS = {}


def reset_notebook_kernel_json():
    _NB_GLOBALS.clear()
    return json.dumps({"ok": True}, ensure_ascii=False)


def run_trace_json(src, options_json="{}"):
    options = json.loads(options_json or "{}")
    if options.get("resetKernel"):
        _NB_GLOBALS.clear()
    use_nb_kernel = bool(options.get("useNotebookKernel", False))
    max_steps = int(options.get("maxSteps", MAX_STEPS))
    time_limit = float(options.get("timeLimit", DEFAULT_TIME_LIMIT))
    enable_trace = bool(options.get("trace", True))
    recorder = _Recorder(src.splitlines(), max_steps, time_limit)
    try:
        tree = ast.parse(src)
        call_line, call_expr, exec_tree = _resolve_entry(tree, src)
        code_obj = compile(exec_tree, FILENAME, "exec")
    except SyntaxError as exc:
        return json.dumps({
            "ok": False,
            "syntaxError": {
                "line": exc.lineno or 1,
                "offset": exc.offset or 0,
                "msg": exc.msg,
                "text": exc.text or "",
            },
        }, ensure_ascii=False)

    module_globals = {
        "__name__": "__main__",
        "__builtins__": __builtins__,
    }
    if use_nb_kernel and _NB_GLOBALS:
        for k, v in _NB_GLOBALS.items():
            if not k.startswith("__") and k not in ("checkpoint", "断点", "print"):
                module_globals[k] = v
    module_globals["checkpoint"] = recorder.checkpoint if enable_trace else (lambda *a, **kw: None)
    module_globals["断点"] = recorder.checkpoint if enable_trace else (lambda *a, **kw: None)
    module_globals["print"] = recorder.print_fn

    fast_state = [0, 1]

    def _fast_guard(frame, event, arg):
        if frame.f_code.co_filename != FILENAME:
            return None
        if event == "line":
            fast_state[1] = frame.f_lineno
            fast_state[0] += 1
            if (fast_state[0] & 255) == 0 and (time.monotonic() - recorder.start) > time_limit:
                raise _TraceTimeout()
        return _fast_guard

    try:
        sys.settrace(recorder.trace if enable_trace else _fast_guard)
        try:
            exec(code_obj, module_globals)
            if call_expr:
                recorder.return_value = eval(call_expr, module_globals)
        finally:
            sys.settrace(None)
    except _StopTrace:
        recorder.error = "已达单步上限 %d，自动停止记录" % max_steps
        recorder.error_line = recorder.steps[-1]["line"] if recorder.steps else 1
    except _TraceTimeout:
        recorder.error = "执行超过 %.1fs，已强制终止（疑似死循环）" % time_limit
        recorder.error_line = (recorder.steps[-1]["line"] if recorder.steps else fast_state[1]) or 1
    except BaseException as exc:
        recorder.error = "%s: %s" % (type(exc).__name__, exc)
        recorder.error_line = None
        tb = exc.__traceback__
        while tb is not None:
            if tb.tb_frame.f_code.co_filename == FILENAME:
                recorder.error_line = tb.tb_lineno
            tb = tb.tb_next
        if recorder.error_line is None:
            recorder.error_line = (recorder.steps[-1]["line"] if recorder.steps else fast_state[1]) or 1
    finally:
        sys.settrace(None)

    if use_nb_kernel:
        for k, v in module_globals.items():
            if not k.startswith("__") and k not in ("checkpoint", "断点", "print"):
                _NB_GLOBALS[k] = v
        for k in list(_NB_GLOBALS.keys()):
            if k not in module_globals:
                del _NB_GLOBALS[k]

    final_locals = _capture_locals({
        key: value for key, value in module_globals.items() if not key.startswith("__")
    })
    final_tagged = {}
    final_budget = [NODE_BUDGET]
    for key, value in final_locals.items():
        final_tagged[key] = _tag_value(value, 0, {}, final_budget, final_locals)

    if enable_trace and recorder.error:
        if recorder.steps and recorder.steps[-1]["line"] == recorder.error_line:
            recorder.steps[-1]["error"] = recorder.error
        else:
            recorder.steps.append({
                "line": recorder.error_line or 1,
                "note": recorder._note(recorder.error_line or 1),
                "vars": final_tagged,
                "stack": [],
                "isCheckpoint": False,
                "checkpointVals": None,
                "error": recorder.error,
            })
    elif enable_trace and recorder.steps:
        final_line = call_line or recorder.steps[-1]["line"]
        recorder.steps.append({
            "line": final_line,
            "note": recorder._note(final_line),
            "vars": final_tagged,
            "stack": [{"id": 0, "fn": "<module>", "label": "global", "line": final_line, "vars": final_tagged}],
            "isCheckpoint": False,
            "checkpointVals": None,
            "error": None,
            "isFinalReturn": True,
        })
    recorder.finished = True
    return json.dumps({
        "ok": True,
        "steps": recorder.steps,
        "finalVars": final_tagged,
        "stdout": "".join(recorder.stdout),
        "error": recorder.error,
        "errorLine": recorder.error_line,
        "returnValue": _tag_value(recorder.return_value),
        "entryLine": call_line,
        "entryExpr": call_expr,
        "meta": json.loads(extract_meta_json(src)),
        "finished": True,
    }, ensure_ascii=False)

