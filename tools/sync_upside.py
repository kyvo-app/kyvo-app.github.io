#!/usr/bin/env python3
"""Copy the estimateUpside() core block from insights.js into tools/upside_estimate.js (keeps both identical)."""
import os, re
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(root, 'insights.js'), encoding='utf-8').read()
core = src[src.index('  /* UPSIDE_CORE_BEGIN'):src.index('/* UPSIDE_CORE_END */') + len('/* UPSIDE_CORE_END */')]
core = core.replace('\n  ', '\n').lstrip()
p = os.path.join(root, 'tools', 'upside_estimate.js')
t = open(p, encoding='utf-8').read()
t = t[:t.index('/* UPSIDE_CORE_BEGIN')] + core + t[t.index('/* UPSIDE_CORE_END */') + len('/* UPSIDE_CORE_END */'):]
open(p, 'w', encoding='utf-8').write(t)
print('synced')
