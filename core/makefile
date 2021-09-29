
build: ../dist/index.js

../dist/%.js: $(wildcard *.ts)
	cp index.d.ts.txt ../dist/index.d.ts
	cp monaco.d.ts ../dist/monaco.d.ts
	rollup -c

watch:
	cp index.d.ts.txt ../dist/index.d.ts
	cp monaco.d.ts ../dist/monaco.d.ts
	rollup -w -c
	