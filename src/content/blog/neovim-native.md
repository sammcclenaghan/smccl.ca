---
title: "Going (Mostly) Plugin-Free in Neovim"
description: "I stripped down my Neovim config to see how much I could do with built-in features. It started as an experiment but now I'm not sure I'll go back."
date: 2024-12-30
---

I've been slowly stripping plugins from my Neovim config. Not because I dislike plugins—just curious how much I can do without them. Turns out, with 0.11 and 0.12, quite a lot.

## LSP without lspconfig

`vim.lsp.enable()` handles server setup now. You drop configs in `~/.config/nvim/lsp/<server>.lua`:

```lua
---@type vim.lsp.Config
return {
  cmd = { 'lua-language-server' },
  filetypes = { 'lua' },
  root_markers = { '.luarc.json' },
}
```

Then enable what you need:

```lua
vim.lsp.enable({ "lua_ls", "ruby_lsp" })
```

That's it. No more lspconfig boilerplate.

## Completion without cmp

`vim.lsp.completion.enable()` hooks into the built-in LSP client:

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

The completion UI is simpler than nvim-cmp, but it works. I'm still figuring out if I miss the fancy features.

## Packages without a package manager

`vim.pack.add()` is the new built-in package manager:

```lua
vim.pack.add({
  { src = "https://github.com/ellisonleao/gruvbox.nvim" },
  { src = "https://github.com/nvim-treesitter/nvim-treesitter", build = ":TSUpdate" },
})
```

It generates a lockfile automatically. Still early days, but I'm enjoying how little ceremony there is.

---

I'm not going fully plugin-free. Treesitter and a colorscheme are still essentials for me. But it's nice that the default answer to "how do I do X in Neovim" is no longer automatically "install another plugin."
