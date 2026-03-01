---
title: "I Deleted My Config to Learn How Neovim Works"
description: "69 lines, 5 plugins, and I finally understand how my editor works. Here's what I learned reading the docs."
date: 2025-12-20
---

I've used Neovim for four years.

And for most of that time, I was terrified of my own editor.

When I say I used Neovim, I really mean I used [LazyVim](https://www.lazyvim.org/)—a massive, preconfigured distribution that I barely understood. It’s a great project, but to me, it was a black box. When my setup broke, I spent more time scrolling through GitHub issues than actually writing code. There were days I dreaded opening my editor.

Then I stumbled upon [this video](https://www.youtube.com/watch?v=xGkL2N8w0H4) by Sylvan Franklin.

He had a 50-line config file. I could look at it and understand *every single line*. It was beautiful. I wanted that feeling.

So over Christmas break, I did something drastic. I deleted my entire config and started from absolute zero.

## Starting From Scratch

Why start from zero? It sounds dramatic, but I've been adopting a new mindset for all my tools: **don't add anything unless you absolutely need it.**

Whether it was said by [ThePrimeagen](https://www.youtube.com/@ThePrimeagen) or [TJ DeVries](https://www.youtube.com/c/tjdevries), I don't remember, but I've internalized it. I’m tired of spending hours optimizing a setup I never actually use. I'm tired of copy-pasting from [Thorsten Ball's dotfiles](https://github.com/mrnugget/dotfiles) or scrolling Reddit for inspiration.

I just wanted three things:
1. **It always works.**
2. **It is mine.**
3. **It feels great.**

My arbitrary constraint to force this? A maximum of 3 plugins.

It turns out Neovim 0.11 and 0.12 have shipped *a lot* of features that used to require plugins. My minimalist experiment quickly turned into a deep dive into the `:help` pages and the Neovim API.

I was genuinely shocked by how far you can go without external plugins today.

## LSP Without `nvim-lspconfig`

Since day one, `nvim-lspconfig` (and a Gruvbox theme) were my only hard requirements.

But in Neovim 0.11, two new interfaces shipped that natively support LSP servers: `vim.lsp.config()` and `vim.lsp.enable()`.

Configuring LSPs is ridiculously simple now. Here is how you configure `ruby-lsp`:

```lua
vim.lsp.config.ruby_lsp = {
  cmd = { 'ruby-lsp' },
  root_markers = { 'Gemfile', '.git' },
  filetypes = { 'ruby', 'eruby' },
}

vim.lsp.enable({'ruby_lsp'})
```

Neovim will even scan files on your runtime path for LSP configurations. You can just drop that exact same config into a file at `~/.config/nvim/lsp/ruby_lsp.lua`:

```lua
return {
  cmd = { 'ruby-lsp' },
  root_markers = { 'Gemfile', '.git' },
  filetypes = { 'ruby', 'eruby' },
}
```

Then, you just call `vim.lsp.enable()` for the servers you want. That's it. No massive plugin required.

## The Plugins Worth Keeping

I wanted to push this further. The Neovim plugin ecosystem is incredible, but what is possible without it?

Neovim 0.12 is adding its own package manager, and it is a blast to use. I realized I never actually needed the lazy-loading features of [lazy.nvim](https://github.com/folke/lazy.nvim). Using the native `vim.pack` is shockingly easy:

```lua
vim.pack.add({
  { src = 'https://github.com/ellisonleao/gruvbox.nvim' },
  {
    src = 'https://github.com/nvim-treesitter/nvim-treesitter',
    data = {
      run = function(_) vim.cmd 'TSUpdate' end,
    },
  },
  { src = 'https://github.com/echasnovski/mini.pick' },
  { src = 'https://github.com/stevearc/oil.nvim' },
  { src = 'https://github.com/nvim-treesitter/nvim-treesitter-textobjects' },
})
```

Those are all my plugins. I failed my 3-plugin limit, but I don't care.

- **Gruvbox and Treesitter:** Non-negotiable.
- **Treesitter Text Objects:** Once you learn them, you can't go back.
- **mini.pick:** A small, focused fuzzy finder that I can actually understand.
- **oil.nvim:** Because editing directories like text buffers makes traditional file trees feel fundamentally wrong.

But if that's all I use, how do I handle diagnostics, completions, and everything else?

## The Neovim API is Incredible

I’ll just say it: the Neovim API is the best API I have ever worked with.

Once I started digging into the help pages, I kept finding built-in solutions. `vim.diagnostic`, user commands, autocommands—the docs are a goldmine. Once you understand how to hook into Neovim's events, you really don't need many plugins.

Here is my custom completion autocmd. It's not `nvim-cmp`, but getting LSP autocompletion built-in is this easy using the new `vim.lsp.completion` API:

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

It’s bare-bones, but it does exactly what I need. I haven't missed `nvim-cmp` once.

Another great example is yank highlighting, adapted from [kickstart.nvim](https://github.com/nvim-lua/kickstart.nvim/tree/master):

```lua
vim.api.nvim_create_autocmd('TextYankPost', {
  callback = function()
    vim.hl.on_yank()
  end,
})
```

But my favorite trick? Restoring the cursor position when reopening a file.

I open and close a lot of files, and losing my place in a massive file was a constant annoyance. I used to look for plugins to solve this. Turns out, I just needed to understand autocommands and buffer marks:

```lua
vim.api.nvim_create_autocmd('BufReadPost', {
  callback = function()
    local mark = vim.api.nvim_buf_get_mark(0, '"')
    if mark[1] > 0 and mark[1] <= vim.api.nvim_buf_line_count(0) then
      vim.api.nvim_win_set_cursor(0, mark)
    end
  end,
})
```

What surprised me the most wasn't finding these features—it was finally understanding *why* they work. The cursor snippet taught me about buffer marks. The completion hook taught me how LSP clients attach to buffers.

Every piece I figured out connected to three more things I didn't know existed.

## 68 Lines

My config is now exactly 68 lines.

I ended up with 5 plugins instead of 3, but the entire thing fits in one file. More importantly, when something breaks, I know exactly where to look.

For the first time in four years, I actually *want* to open Neovim.
