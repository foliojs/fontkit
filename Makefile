SOURCES = $(shell find src)

all: index.js base.js

src/opentype/shapers/data.trie:
	babel-node src/opentype/shapers/generate-data.js

data.trie: src/opentype/shapers/data.trie
	cp src/opentype/shapers/data.trie data.trie

index.js: $(SOURCES) data.trie
	rollup -c -m -i src/index.js -o index.js

base.js: $(SOURCES) data.trie
	rollup -c -m -i src/base.js -o base.js

clean:
	rm -f index.js base.js data.trie src/opentype/shapers/data.trie
