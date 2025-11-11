# Discord Bot Project

## Overview
A comprehensive Discord bot with 224 commands across 7 categories, all contained in a single JavaScript file. The bot features moderation, economy, fun commands, persistent data storage, and advanced automod capabilities.

## Recent Changes
- **2025-11-10**: Complete bot implementation
  - Created single-file architecture in bot.js (2,238 lines)
  - Implemented all 224 commands across 7 categories
  - Set up JSON-based data persistence (warns, economy, inventory, cooldowns)
  - Configured bad-word filter with auto-warn and auto-ban system
  - Added styled DM embeds for warnings
  - Integrated Discord bot token via environment variables
  - Fixed data persistence to load before bot starts

## Project Architecture
- **Single-file design**: All code in `bot.js` (2,238 lines)
- **Data persistence**: JSON file storage (`data.json`) for:
  - Warns tracking with 5-warn auto-ban
  - Economy balances (wallet + bank)
  - User inventories
  - Command cooldowns
  - AFK status and messages
  - Snipe/edit-snipe data
  - Server settings (bad words, channels)
- **Command categories**: 7 categories with 224 total commands
- **Prefix**: Fixed to `>` (cannot be changed)
- **Single-reply guarantee**: Each command sends exactly one message

## Command Categories

### 🛡️ Moderation (25 commands)
kick, ban, unban, warn, unwarn, clearwarnings, warnings, timeout, untimeout, mute, unmute, lock, unlock, slowmode, clear, purge, nick, role, addrole, removerole, massban, massnick, nuke, clone, setpermissions

### 💰 Economy (40 commands)
balance, daily, weekly, work, beg, rob, pay, leaderboard, shop, buy, inventory, use, sell, trade, deposit, withdraw, gamble, crime, search, hunt, fish, mine, chop, farm, cook, craft, gift, share, steal, heist, business, invest, stocks, lottery, scratch, casino, jackpot, vault, bank, rich, poor

### ℹ️ Information (45 commands)
userinfo, serverinfo, botinfo, avatar, banner, roles, emojis, channels, membercount, roleinfo, channelinfo, ping, uptime, invite, stats, permissions, snowflake, firstmessage, joined, created, boosters, bots, humans, oldest, newest, badges, status, spotify, whois, lookupuser, lookupserver, afklist, emojiinfo, stickerinfo, inviteinfo, servericon, serverbanner, perms, rolecolor, rolemembers, channelperms, auditlog, fetchban, fetchinvites, vanity, splash

### 🎮 Fun (59 commands)
meme, joke, roast, compliment, 8ball, roll, flip, rps, trivia, quiz, wouldyourather, truth, dare, kiss, hug, slap, pat, poke, bite, cuddle, ship, love, simp, iq, pp, hack, kill, marry, coinflip, dice, choose, reverse, mock, ascii, emojify, clap, vaporwave, leet, owo, uwu, greentext, regional, space, binary, encode, decode, randomuser, randomquote, randomfact, rate, howcool, howdumb, howsmart, hownice, howevil, chucknorris, dadjoke, yomama, insult, advice

### 🎨 Image & Animals (35 commands)
cat, dog, fox, bird, panda, koala, redpanda, raccoon, kangaroo, duck, bunny, lizard, frog, whale, seal, lion, tiger, bear, elephant, giraffe, horse, cow, pig, chicken, fish, shark, dolphin, snake, owl, penguin, wolf, cheetah, gorilla, zebra, rhino

### 🔧 Utility (40 commands)
poll, suggest, remind, timer, stopwatch, announcement, embed, say, dm, react, snipe, editsnipe, giveaway, ticket, report, bug, feedback, color, enlarge, steal, stealemoji, search, findemoji, calculate, math, convert, translate, weather, time, timezone, reminder, todo, notes, afk, unafk, members, inrole, emojis, serveremojis

### ⚙️ Configuration (20 commands)
prefix, setprefix, language, setlanguage, welcome, goodbye, autorole, setactivity, setstatus, logs, setlogs, muterole, antilink, antispam, verification, captcha, automod, filter, addword, removeword

## Key Features

### Moderation System
- Permission checks on all moderation commands
- Bad-word filter with automatic message deletion
- Automatic warnings when bad words are used
- Styled DM embeds sent to warned users showing:
  - Warning reason
  - Current warning count (X/5)
  - Next steps or ban notice
- 5-warn auto-ban system
- Snipe and edit-snipe commands to see deleted/edited messages

### Economy System
- Wallet + Bank balance tracking
- Daily and weekly rewards with cooldowns
- Work, beg, search, hunt, fish, mine, chop commands
- Gambling and crime mechanics
- Rob other users with success/failure outcomes
- Shop system with purchasable items
- Inventory management
- Leaderboard showing top 10 richest users

### Bot Configuration
- `>setactivity <text>` - Change bot activity (owner only)
- `>setstatus <online|idle|dnd|invisible>` - Change bot status (owner only)
- `>addword <word>` - Add word to bad-word filter (requires Manage Server)
- `>removeword <word>` - Remove word from filter (requires Manage Server)
- `>filter` - View current filtered words

### Help Command
- Shows all 224 commands in a single embed
- All command names displayed in **bold**
- Organized by category with emoji icons
- Footer shows prefix and total command count

## Technical Details
- **Language**: JavaScript (Node.js)
- **Framework**: Discord.js v14
- **Dependencies**: discord.js, node-fetch
- **Data Storage**: JSON file (data.json)
- **Environment Variables**: DISCORD_BOT_TOKEN
- **Bot Intents**: Guilds, GuildMessages, MessageContent, GuildMembers, GuildPresences, GuildModeration

## Setup Requirements
1. Discord bot token from Discord Developer Portal
2. Enable Privileged Gateway Intents:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent
3. Invite bot to server with proper permissions

## User Preferences
- Prefers single-file architecture
- Fixed prefix `>` (non-configurable by design)
- No duplicate messages or spam
- Persistent data across restarts
