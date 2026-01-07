---
title: "Neovim Without the Plugins"
description: "Neovim 0.11 and 0.12 ship native LSP, completion, and package management. Here's what a minimal config looks like now."
date: 2024-12-30
---

Neovim 0.11 and 0.12 added native alternatives to nvim-lspconfig, nvim-cmp, and lazy.nvim. Here's the quick rundown.

## LSP

`vim.lsp.enable()` replaces nvim-lspconfig. Put config files in `~/.config/nvim/lsp/<server>.lua`:

```lua
---@type vim.lsp.Config
return {
  cmd = { 'lua-language-server' },
  filetypes = { 'lua' },
  root_markers = { '.luarc.json' },
}
```

Then enable them:

```lua
vim.lsp.enable({ "lua_ls", "ruby_lsp" })
```

## Completion

`vim.lsp.completion.enable()` replaces nvim-cmp:

```lua
vim.api.nvim_create_autocmd('LspAttach', {
  callback = function(ev)
    local client = vim.lsp.get_client_by_id(ev.data.client_id)
    if client:supports_method('textDocument/completion') then
      vim.lsp.completion.enable(true, client.id, ev.buf, { autotrigger = true })
    end
  end,
})
```

## Packages

`vim.pack.add()` replaces lazy.nvim:

```lua
vim.pack.add({
  { src = "https://github.com/ellisonleao/gruvbox.nvim" },
  { src = "https://github.com/nvim-treesitter/nvim-treesitter", build = ":TSUpdate" },
  { src = "https://github.com/echasnovski/mini.pick" },
})
```

Generates a lockfile automatically.

---

You still need plugins for some things. But the default answer to "how do I do X in Neovim" doesn't have to be "install Y plugin" anymore.
