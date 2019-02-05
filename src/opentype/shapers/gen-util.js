export function generateTrieModuleContents (trie) {
  const base64EncodedTrie = trie.toBuffer().toString('base64');
  return `const data = Buffer.from(${JSON.stringify(base64EncodedTrie)}, 'base64');\nexport default data;\n`;
};
