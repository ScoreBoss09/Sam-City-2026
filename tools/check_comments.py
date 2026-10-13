# Finds // comments that have swallowed real code (a line edit that left code after a comment). Run: python3 tools/check_comments.py
import re,sys,glob
code_like=re.compile(r"(\bif \(|\bfor \(|\b(const|let) [A-Za-z_$]+ ?=|[A-Za-z_$\]\)]\.[A-Za-z_$]+\([^)]*\);|\) \{|;\s*[A-Za-z_$]+\s*=[^=])")
def comments(src):
    i=0;n=len(src);out=[];line=1;prev=''
    while i<n:
        c=src[i]
        if c=='\n': line+=1
        if c in '"\'`':
            q=c;i+=1
            while i<n and src[i]!=q:
                if src[i]=='\\': i+=1
                if src[i]=='\n': line+=1
                i+=1
            i+=1;prev='a';continue
        if c=='/' and i+1<n and src[i+1]=='/':
            j=src.find('\n',i); j=n if j<0 else j; out.append((line,src[i:j])); i=j; continue
        if c=='/' and i+1<n and src[i+1]=='*':
            j=src.find('*/',i+2); line+=src[i:j].count('\n'); i=j+2; continue
        if c=='/' and prev in '(,=:[!&|?{};+-*%<>~^' :
            # regex literal
            i+=1
            while i<n and src[i]!='/' and src[i]!='\n':
                if src[i]=='\\': i+=1
                elif src[i]=='[':
                    while i<n and src[i]!=']': i+=1
                i+=1
            i+=1;prev='a';continue
        if not c.isspace(): prev=c
        i+=1
    return out
for f in sorted(glob.glob('src/**/*.js',recursive=True))+['serve.js','netrelay.js','relay-server.js']:
    for ln,t in comments(open(f).read()):
        if code_like.search(t[2:]): print(f"{f}:{ln}: {t[:170]}")
