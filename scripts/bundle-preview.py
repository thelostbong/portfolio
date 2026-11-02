#!/usr/bin/env python3
"""Build preview/index.html: one self-contained page fragment (styles, fonts, markup, script)
made from the static export. Run `next build` first. The markup is the exact server-rendered
HTML from out/index.html; behaviour comes from scripts/preview-entry.js bundled with esbuild.
The fragment has no <html>/<head>/<body>, so an artifact host can wrap it."""
import base64, os, re, shutil, subprocess
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
out, dst = os.path.join(root, "out"), os.path.join(root, "preview")
os.makedirs(dst, exist_ok=True)
html = open(os.path.join(out, "index.html"), encoding="utf-8").read()

css_href = re.search(r'<link rel="stylesheet" href="([^"]+)"', html).group(1)
css = open(os.path.join(out, css_href.lstrip("/")), encoding="utf-8").read()
css = re.sub(r",\s*url\([^)]*\.woff\)\s*format\(['\"]woff['\"]\)", "", css)
def font(m):
    data = open(os.path.join(out, "_next/static/media", os.path.basename(m.group(1))), "rb").read()
    return "url(data:font/woff2;base64,%s)" % base64.b64encode(data).decode()
css = re.sub(r"url\(((?:\.\./media|/_next/static/media)/[^)]+\.woff2)\)", font, css)

body = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)
body = re.sub(r"<script\b.*?</script>", "", body, flags=re.S)
body = body.replace('href="/Nayeemuddin_Mohammed_CV.pdf"', 'href="Nayeemuddin_Mohammed_CV.pdf"')

bundle = os.path.join(dst, "_bundle.js")
subprocess.run(["npx", "--yes", "esbuild", os.path.join(root, "scripts/preview-entry.js"), "--bundle", "--minify",
                "--format=iife", "--target=es2020", "--outfile=" + bundle], check=True, cwd=root)
js = open(bundle, encoding="utf-8").read().replace("</script", "<\\/script")
os.remove(bundle)

title = "Nayeemuddin Mohammed"
page = ('<title>%s</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>%s\n'
        'html{background:#0a0b09}body{margin:0;background:#0a0b09;color:#e7e4d8}</style>\n%s\n<script>%s</script>\n'
        % (title, css, body, js))
open(os.path.join(dst, "index.html"), "w", encoding="utf-8").write(page)
shutil.copy(os.path.join(out, "Nayeemuddin_Mohammed_CV.pdf"), dst)
print("preview/index.html", round(len(page) / 1e6, 2), "MB")
