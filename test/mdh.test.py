"""Run: python3 test/mdh.test.py"""
import importlib.machinery, importlib.util, os
p = os.path.join(os.path.dirname(__file__), "..", "mods", "herdr-md", "mdh")
m = importlib.util.module_from_spec(importlib.util.spec_from_loader("mdh", importlib.machinery.SourceFileLoader("mdh", p)))
m.__loader__.exec_module(m)

def ls(*terms):
    return {"spaces": [{"tabs": [{"terminals": list(terms)}]}]}
T = lambda t, pane, subs=(): {"terminal": t, "pane": pane, "sub_agents": list(subs)}

bare = ls(T("t1", "pA"), T("t1r9", "pB"))
assert m.find_pane(bare, "t1r9") == "pB"
pre = ls(T("ska/t19", "ska/pX"), T("t19", "pLocal"))
assert m.find_pane(pre, "t19") == "pLocal"              # exact beats suffix
assert m.find_pane(ls(T("ska/t19", "ska/pX")), "t19") == "ska/pX"
assert m.find_pane(ls(T("t5", "pP", [{"terminal": "t6"}])), "t6") == "pP"   # sub-agent -> parent
assert m.find_pane(ls(T("t5", "pP", ["t6"])), "t6") == "pP"
assert m.find_pane(bare, "t999") is None
assert m.find_pane(bare, None) is None and m.find_pane({}, "t1") is None
assert m.find_pane(ls(T("xt1", "pA")), "t1") is None    # suffix needs the slash
print("ok")
