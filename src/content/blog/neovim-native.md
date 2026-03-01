---
title: "I Deleted My Config to Learn How Neovim Works"
description: "69 lines, 5 plugins, and I finally understand how my editor works. Here's what I learned reading the docs."
date: 2024-12-30
---

I have been a Neovim user for about four years now. Looking back, I realize I was spending more time scrolling through GitHub issues than actually writing code. And when I say I use Neovim, I really mean I use [LazyVim](https://www.lazyvim.org/)—a preconfigured distribution I barely understood. There were times where I knew my setup was broken and I genuinely did not want to open it. It was a chore. I was tired of feeling like my editor was a black box I couldn't fix.

Then I stumbled upon [this video](https://www.youtube.com/watch?v=xGkL2N8w0H4) by Sylvan Franklin, and I was mesmerized. A 50 line config file! And just by looking at it I could understand every line. It was beautiful, and I wanted that feeling every time I opened neovim. So over christmas break, I deleted my entire config and started from zero.

## Starting from Scratch
Now, why start from zero? It's a little dramatic, I know, but there has been a mindset I've been adopting with all of my tools: don't add anything unless you need it. Whether it was said by [ThePrimeagen](https://www.youtube.com/@ThePrimeagen) or [TJ DeVries](https://www.youtube.com/c/tjdevries), I don't remember, but I've internalized it in everything I do. It solved a lot of the issues I had with spending hours optimizing my setup but never really using it. I wanted to go a step further though, I wanted to write every part of my config. I was tired of looking through [Thorsten Ball's dotfiles](https://github.com/mrnugget/dotfiles), or scrolling through reddit for inspiration. I just wanted 3 things: it always works, it is mine, and it feels great. And as a result of that, I wanted a max of 3 plugins.

Neovim 0.11 and 0.12 have shipped a lot of features that used to require plugins, and I wanted to see how far they'd actually take me before I needed anything external. This turned out to be way less about being minimalist and more about learning. I ended up spending a lot of time reading `:help` pages and the Neovim API docs, and I was honestly surprised how far you can go without plugins now.

## LSP without `nvim-lspconfig`

Since I had started using Neovim, one of the only requirements besides gruvbox for me was `nvim-lspconfig`. However, in Neovim 0.11, two new interfaces shipped to natively support LSP servers: `vim.lsp.config()` and `vim.lsp.enable()`. Configuring LSPs is so much simpler now. For example, to configure ruby-lsp:

```lua
vim.lsp.config.ruby_lsp = {
  cmd = { 'ruby-lsp' },
  root_markers = { 'Gemfile', '.git' },
  filetypes = { 'ruby', 'eruby' },
}

vim.lsp.enable({'ruby_lsp'})
```

Neovim will also scan files on your runtime path for LSP configurations. So the same ruby-lsp example can instead be a file at `~/.config/nvim/lsp/ruby_lsp.lua`:

```lua
return {
  cmd = { 'ruby-lsp' },
  root_markers = { 'Gemfile', '.git' },
  filetypes = { 'ruby', 'eruby' },
}
```

Then you only need to call `vim.lsp.enable()` with all the LSP servers you want to use.

## Plugins worth keeping

I wanted to push this further—how much could I actually do with just Neovim's built-in features? The plugin ecosystem is incredible, but I was curious what was possible without it. Although not officially out as of when this post was written, Neovim 0.12 is adding its own package manager, and it is a blast. I never needed the lazy loading feature of [lazy.nvim](https://github.com/folke/lazy.nvim), so using `vim.pack` has been so nice. It's as easy as:

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

And there, those are all my plugins! Gruvbox and treesitter are non-negotiable for me. Once you get accustomed to treesitter text objects, there's no going back. mini.pick I added just because it's a small, focused plugin I can understand. And oil.nvim because once you start editing your directories like buffers, a traditional file tree just feels wrong. But if that's all I use, how do I handle diagnostics, completions, and everything else? Well, I learned a couple tricks looking through the docs.

## Some tricks I learned from the docs
I will go out on a limb and say it: the Neovim API is the best API I have ever worked with. Once I started reading the help pages, I kept finding things that were just built in. Whether it was `vim.diagnostic` or user commands, the docs were a wealth of knowledge. But my favourite part was learning about autocommands, and the events I could hook into for custom behaviour. And honestly, once you understand how to use them, you don't need a lot of plugins.

Here is my completions autocmd. It's definitely not an alternative to `nvim-cmp`, but it's amazing I can have my own completion logic so easily. You can hook up the new `vim.lsp.completion` API to an autocmd to get LSP autocompletion built in:

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

Although this is much more bare-bones than `nvim-cmp`, I haven't missed it once. It has the basic functionality I need. Another good example of autocommands is one I adapted from the [kickstart.nvim](https://github.com/nvim-lua/kickstart.nvim/tree/master) repository: yank highlighting.

```lua
vim.api.nvim_create_autocmd('TextYankPost', {
  callback = function()
    vim.hl.on_yank()
  end,
})
```

By far the one I use the most is restoring cursor position when reopening a file. I open and close a lot of files when navigating codebases, and I lose my place sometimes in big files. This was always an issue for me in Neovim, but I could never find a plugin for it. Once I understood autocommands, I realized I could just handle it myself:

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

What surprised me most wasn't just finding these features—it was understanding *why* they work. Reading through the autocommand documentation, I started seeing patterns in how Neovim handles events. The cursor restoration snippet taught me about buffer marks. The completion hook showed me how LSP clients attach to buffers.

Each piece I figured out connected to three more I didn't know existed.

## 68 Lines

My config is 68 lines. I understand every single one of them.

I ended up with 5 plugins instead of 3, but I'm not mad about it. The whole thing fits in one file, and when something breaks, I know exactly where to look.

For the first time in four years, I actually want to open Neovim.
