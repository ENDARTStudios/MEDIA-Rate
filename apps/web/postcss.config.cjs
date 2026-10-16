/* eslint-disable no-undef -- postcss.config.cjs é CommonJS */
// D-651 (Tailwind 4): o plugin passou a ser @tailwindcss/postcss, que já embute
// prefixacao (Lightning CSS) — por isso o autoprefixer saiu da cadeia.
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
