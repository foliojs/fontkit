SOURCES = $(shell find src)

SHELL := /bin/bash
PATH := ./node_modules/.bin:$(PATH)

all: index.js base.js

src/opentype/shapers/data.trie:
	babel-node src/opentype/shapers/generate-data.js

src/opentype/shapers/use.trie:
	babel-node src/opentype/shapers/gen-use.js

src/opentype/shapers/indic.trie:
	babel-node src/opentype/shapers/gen-indic.js

data.trie: src/opentype/shapers/data.trie
	cp src/opentype/shapers/data.trie data.trie

use.trie: src/opentype/shapers/use.trie
	cp src/opentype/shapers/use.trie use.trie

indic.trie: src/opentype/shapers/indic.trie
	cp src/opentype/shapers/indic.trie indic.trie

index.js: $(SOURCES) data.trie use.trie indic.trie
	rollup -c -m -i src/index.js -o index.js

base.js: $(SOURCES) data.trie use.trie indic.trie
	rollup -c -m -i src/base.js -o base.js

clean:
	rm -f index.js base.js data.trie indic.trie use.trie src/opentype/shapers/data.trie src/opentype/shapers/use.trie src/opentype/shapers/use.json src/opentype/shapers/indic.trie src/opentype/shapers/indic.json
