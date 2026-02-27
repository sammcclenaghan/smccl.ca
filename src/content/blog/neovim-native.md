---
title: "you shouldn't use plugins"
description: "I deleted my Neovim config and rebuilt it from scratch. 67 lines, 4 plugins, and I finally understand how my editor works."
date: 2024-12-30
---

You shouldn't use plugins.

Obviously you can. But try going a week without them. Just one week. Delete your config, open a blank `init.lua`, and only add things you can actually explain to someone. I think you'll be surprised how little you miss — and how much you learn about the tool you use every day.

Here's what I realized: most Neovim configs (mine included) are a pile of plugins the user half-understands, held together by copy-pasted setup blocks from GitHub READMEs. Completion? nvim-cmp. LSP? lspconfig. File picker? Telescope. Package management? lazy.nvim. I had all of these. It worked, but I couldn't tell you *why* it worked. And when something broke — some weird error about a nil client or a capability mismatch — I had no idea where to even start debugging. I'd just search the plugin's issues page and hope someone else had hit the same thing.

So I tried something different. I deleted my config and started from zero.

## the experiment

The rule was simple: only add things I understand. If I can't explain what a line does, it doesn't go in the file. No copy-pasting from dotfiles repos, no "just add this to your config" Reddit advice. Neovim 0.11 and 0.12 have shipped a lot of features that used to require plugins, and I wanted to see how far they'd actually take me before I reached for anything external.

This turned out to be less about minimalism and more about learning. I ended up spending way more time reading `:help` pages and the Neovim API docs than I ever did scrolling through plugin READMEs. And the stuff I found in there changed how I think about configuring my editor.

## LSP without lspconfig

This was the biggest surprise. I'd been using lspconfig for so long that I assumed you *needed* it. Turns out, `vim.lsp.enable()` does everything natively now. You create a config file in `~/.config/nvim/lsp/` for each language server:

```lua
-- lsp/lua_ls.lua
---@type vim.lsp.Config
return {
  cmd = { 'lua-language-server' },
  filetypes = { 'lua' },
  root_markers = { '.luarc.json' },
}
```

Then enable the servers you want:

```lua
vim.lsp.enable({ "lua_ls", "ruby_lsp", "herb_ls" })
```

That's the entire LSP setup. No plugin, no `on_attach` callbacks, no capabilities table. The built-in client reads the config, finds the binary, determines the project root from the markers, and attaches to matching buffers. This took two minutes. I spent weeks tweaking lspconfig setups in my old config — fiddling with `on_attach` functions, merging capability tables, debugging why a server wasn't attaching to a specific filetype. All of that is just... gone.

## completion without nvim-cmp

nvim-cmp was always the most complex part of my config. Multiple sources, custom keybindings, snippet integration, formatting — the setup block alone was 40+ lines of code I mostly didn't write. Neovim now has `vim.lsp.completion.enable()`, and it hooks directly into the built-in completion menu.

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

I'll be honest: the built-in completion UI is simpler than nvim-cmp. There's no source mixing, no fancy formatting, no ghost text. It's a popup menu with LSP suggestions. I've been using it for a while now and I'm still not sure if I miss the extra features or if I was just used to having them. That's kind of the point of all this — figuring out what I actually need versus what I've been told I need.

## learning how your editor actually works

This is the part I didn't expect. When you strip away all the plugins, you're forced to interact with the Neovim API directly. And the API is *really good*. I just never bothered to learn it because there was always a plugin that abstracted it away.

Take that completion autocmd above. Before this experiment, I would have looked at `vim.api.nvim_create_autocmd` and thought "that's internal stuff, I don't need to know that." But it's not internal stuff — it's how Neovim works. An autocmd is just "when this event happens, run this function." Once you understand that, you can build almost anything.

Here's yank highlighting — when you yank text, it briefly flashes so you can see what you copied:

```lua
vim.api.nvim_create_autocmd('TextYankPost', {
  callback = function()
    vim.hl.on_yank()
  end,
})
```

That's it. The `TextYankPost` event fires after any yank operation, and `vim.hl.on_yank()` does the highlight flash. I used to have a plugin for this. A whole plugin. For two lines.

Here's another one — enabling treesitter highlighting for every filetype:

```lua
vim.api.nvim_create_autocmd('FileType', {
  callback = function()
    pcall(vim.treesitter.start)
  end,
})
```

The `pcall` is there because not every filetype has a treesitter parser, and I don't want an error when I open a random config file. The `FileType` event fires whenever Neovim detects what kind of file you've opened. Simple.

And keymaps work the same way. `vim.keymap.set` is straightforward once you stop being intimidated by it:

```lua
vim.keymap.set('n', '<leader>ff', MiniPick.builtin.files, { desc = 'Find files' })
vim.keymap.set('n', '<leader>fg', MiniPick.builtin.grep_live, { desc = 'Live grep' })
vim.keymap.set('n', '<leader>fb', MiniPick.builtin.buffers, { desc = 'Buffers' })
```

First argument is the mode (`n` for normal), second is the key, third is what it does, fourth is optional metadata. That's the whole API. No wrapper functions, no abstractions. When I was using lazy.nvim, my keymaps were spread across five different plugin spec files and I could never remember where anything was bound. Now they're all in one place and I can read them like a list.

The pattern I keep coming back to is `vim.api.nvim_create_autocmd`. Once you get comfortable with it, you start seeing opportunities everywhere. Want to auto-format on save? Autocmd on `BufWritePre`. Want to set specific options for markdown files? Autocmd on `FileType` with a pattern. Want to open the last cursor position when you reopen a file? Autocmd on `BufReadPost`. Neovim gives you the events and the API — plugins are just someone else's autocmds packaged up with a README.

## what I kept and why

I do still use plugins. Four of them. But I keep these because I understand why I need them, not because someone on Reddit told me to.

**Treesitter** stays because syntax highlighting and code folding are fundamentally better with a real parser. The highlighting quality difference is obvious — regex-based highlighting breaks on nested structures, treesitter doesn't. I set folds to use `vim.treesitter.foldexpr()` and it just works.

**Gruvbox** stays because I like how it looks. Not much more to say about that.

**mini.pick** stays for fuzzy finding. Neovim's built-in `:find` isn't a real replacement for a fuzzy picker — I need to search files, live grep, and switch buffers quickly. It's a small, focused plugin that does one thing well.

**oil.nvim** stays for file browsing. I edit directories like buffers, which is the mental model I want. Netrw exists but using it feels like fighting the editor. One keymap: `-` opens the parent directory.

I use the built-in `vim.pack.add()` to manage these:

```lua
vim.pack.add({
  { src = "https://github.com/ellisonleao/gruvbox.nvim" },
  {
    src = 'https://github.com/nvim-treesitter/nvim-treesitter',
    build = ':TSUpdate'
  },
  { src = "https://github.com/echasnovski/mini.pick" },
  { src = "https://github.com/stevearc/oil.nvim" },
})
```

No lazy loading, no complex dependency resolution, no startup time optimization. For four plugins, none of that matters.

Everything else is built-in. Diagnostics with `vim.diagnostic.config({ virtual_text = true })`. Clipboard sync with `unnamedplus`. Relative line numbers, `scrolloff = 10`, `signcolumn = 'yes'` — small settings that make the editor feel right.

## 67 lines

My entire config is 67 lines. I can read it top to bottom in a minute and tell you exactly what every line does. That wasn't true of my old config, even though I was the one who wrote it — or more accurately, I was the one who assembled it from pieces of other people's configs.

You shouldn't use plugins. Not because they're bad — I'm still using four of them. But because the default answer to every problem shouldn't be "install something." Starting from scratch forced me to check what Neovim already provides before reaching for a dependency, and it forced me to actually learn the API I'd been abstracting away for years.

Try going a week without plugins. Figure out what you actually need. Read some `:help` pages. Write some autocmds. You might end up adding most of your plugins back — that's fine. But at least you'll know *why* you need them, and when something breaks at 2am, you'll know where to start looking.
