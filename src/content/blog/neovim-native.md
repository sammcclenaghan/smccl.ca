---
title: "Building a Neovim Config with Only Native Features"
description: "Neovim 0.11 and 0.12 changed everything. Here's how I rebuilt my config from scratch using vim.lsp.enable(), vim.pack.add(), and native completion."
date: 2024-12-30
---

I've always loved ricing neovim to no tomorrow. Copying other people's setups and seeing how I work with them was always a perfect sunday afternoon for me. I would wind down watching ultimate neovim setup tutorials, debugging config issues and adding plugins, all to hate coding with it and switch back to zed.

Then Neovim 0.11 and 0.12 released, and I realized most of my plugins were solving problems Neovim now solved natively. I deleted my entire config and rebuilt it with the new primitives. Here's what that looks like.

## The New Primitives

### Native LSP Configuration

`vim.lsp.enable()` replaces nvim-lspconfig. Drop a config file in `~/.config/nvim/lsp/<server>.lua` and enable servers with one line:

```lua
vim.lsp.enable({ "lua_ls", "ruby_lsp" })
```

The config files are simple Lua tables with `vim.lsp.Config` type annotation:

```lua
---@type vim.lsp.Config
return {
  cmd = { 'lua-language-server' },
  filetypes = { 'lua' },
  root_markers = { '.luarc.json' },
}
```

### Native LSP Completion

`vim.lsp.completion.enable()` replaces nvim-cmp and all its companion plugins:

```lua
vim.api.nvim_create_autocmd('LspAttach', {
  callback = function(ev)
    local client = vim.lsp.get_client_by_id(ev.data.client_id)
    if client:supports_method('textDocument/completion') then
      vim.lsp.completion.enable(true, client.id, ev.buf, { autotrigger = true })
    end
  end,
})

vim.cmd("set completeopt+=noselect")
```

### Native Package Management

`vim.pack.add()` replaces lazy.nvim, packer.nvim, and all their bootstrap complexity:

```lua
vim.pack.add({
  { src = "https://github.com/ellisonleao/gruvbox.nvim" },
  { src = "https://github.com/nvim-treesitter/nvim-treesitter", build = ":TSUpdate" },
  { src = "https://github.com/echasnovski/mini.pick" },
  { src = "https://github.com/stevearc/oil.nvim" },
})
```

It supports GitHub URLs, local plugin development via `file://` paths, build commands, and automatically generates `nvim-pack-lock.json` for reproducibility.

## The Shift

The Neovim ecosystem trained me to reach for plugins first. Need completion? Plugin. Need LSP? Plugin. Need to manage plugins? Plugin.

But Neovim 0.11/0.12 solved most of these problems natively. The native LSP completion is fast, `vim.pack.add()` is intentionally simple, and `vim.lsp.enable()` provides declarative server configuration.

I still use plugins. But the default answer to "how do I do X" shouldn't be "install Y plugin" anymore. Check what Neovim does natively first.
