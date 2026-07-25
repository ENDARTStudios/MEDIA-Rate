const fs = require('fs');
const path = require('path');

const aliasMap = {
  '@mediarate/core-ports': '../../packages/core-ports/src/index.ts',
  '@mediarate/core-errors': '../../packages/core-errors/src/index.ts',
  '@mediarate/core-result': '../../packages/core-result/src/index.ts',
  '@mediarate/core-events': '../../packages/core-events/src/index.ts',
  '@mediarate/core-config': '../../packages/core-config/src/index.ts',
  '@mediarate/core-domain': '../../packages/core-domain/src/index.ts',
};

function resolveWithExtensions(basePath) {
  // 1. Caminho exato
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) return basePath;
  // 2. Se tem extensão .js e não existe, trocar para .ts
  if (basePath.endsWith('.js')) {
    const tsPath = basePath.replace(/\.js$/, '.ts');
    if (fs.existsSync(tsPath)) return tsPath;
  }
  // 3. Adicionar extensões .ts e .js
  for (const ext of ['.ts', '.js']) {
    const withExt = basePath + ext;
    if (fs.existsSync(withExt)) return withExt;
  }
  // 4. Tentar como diretório com index.ts/index.js
  for (const indexFile of ['index.ts', 'index.js']) {
    const indexPath = path.join(basePath, indexFile);
    if (fs.existsSync(indexPath)) return indexPath;
  }
  return null;
}

module.exports = (request, options) => {
  // Aliases @mediarate/*
  if (aliasMap[request]) {
    const resolved = path.resolve(options.rootDir || '.', aliasMap[request]);
    if (fs.existsSync(resolved)) return resolved;
  }
  // Caminhos relativos
  if (request.startsWith('.')) {
    const basePath = path.resolve(options.basedir, request);
    const resolved = resolveWithExtensions(basePath);
    if (resolved) return resolved;
  }
  // Fallback padrão
  return options.defaultResolver(request, options);
};


