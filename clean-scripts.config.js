module.exports = {
  build: [
    `sleep 1 && echo clean`,
    {
      js: `sleep 2 && echo js`,
      css: `sleep 1 && echo css`
    },
    `sleep 1 && echo bundle`
  ]
}
