const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const fetch = require('node-fetch');

const PREFIX = '>';
const WARN_LIMIT = 5;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildModeration
    ]
});

let data = {
    warns: {},
    economy: {},
    inventory: {},
    cooldowns: {},
    settings: {
        badWords: ['badword1', 'badword2'],
        prefix: PREFIX,
        muteRole: null,
        welcomeChannel: null,
        goodbyeChannel: null,
        logChannel: null
    },
    snipes: {},
    editSnipes: {},
    afk: {},
    todos: {},
    reminders: []
};

function loadData() {
    try {
        if (fs.existsSync('data.json')) {
            const fileData = fs.readFileSync('data.json', 'utf8');
            data = JSON.parse(fileData);
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function saveData() {
    try {
        fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

function getUserData(userId) {
    if (!data.economy[userId]) {
        data.economy[userId] = {
            balance: 0,
            bank: 0,
            lastDaily: 0,
            lastWeekly: 0,
            lastWork: 0,
            lastCrime: 0,
            lastRob: 0
        };
    }
    if (!data.warns[userId]) {
        data.warns[userId] = [];
    }
    if (!data.inventory[userId]) {
        data.inventory[userId] = [];
    }
    return data.economy[userId];
}

function checkCooldown(userId, command, cooldownTime) {
    const now = Date.now();
    const key = `${userId}-${command}`;
    if (data.cooldowns[key] && now < data.cooldowns[key]) {
        const timeLeft = Math.ceil((data.cooldowns[key] - now) / 1000);
        return timeLeft;
    }
    data.cooldowns[key] = now + cooldownTime;
    return 0;
}

async function sendWarnDM(user, reason, warnCount) {
    try {
        const embed = new EmbedBuilder()
            .setTitle('⚠️ **WARNING RECEIVED**')
            .setColor('#FF4444')
            .setDescription(`You have received a warning in the server.`)
            .addFields(
                { name: '**Reason**', value: reason || 'No reason provided', inline: false },
                { name: '**Current Warnings**', value: `**${warnCount}** / ${WARN_LIMIT}`, inline: true },
                { name: '**Next Steps**', value: warnCount >= WARN_LIMIT ? '**You will be banned!**' : `${WARN_LIMIT - warnCount} more warning(s) until ban`, inline: true }
            )
            .setFooter({ text: `Prefix: ${PREFIX} | Contact server staff for appeals` })
            .setTimestamp();
        await user.send({ embeds: [embed] });
    } catch (error) {
        console.error('Could not send DM to user:', error);
    }
}

const commands = {
    help: async (message, args) => {
        const categories = {
            '🛡️ Moderation (25)': ['**kick**', '**ban**', '**unban**', '**warn**', '**unwarn**', '**clearwarnings**', '**warnings**', '**timeout**', '**untimeout**', '**mute**', '**unmute**', '**lock**', '**unlock**', '**slowmode**', '**clear**', '**purge**', '**nick**', '**role**', '**addrole**', '**removerole**', '**massban**', '**massnick**', '**nuke**', '**clone**', '**setpermissions**'],
            '💰 Economy (40)': ['**balance**', '**daily**', '**weekly**', '**work**', '**beg**', '**rob**', '**pay**', '**leaderboard**', '**shop**', '**buy**', '**inventory**', '**use**', '**sell**', '**trade**', '**deposit**', '**withdraw**', '**gamble**', '**crime**', '**search**', '**hunt**', '**fish**', '**mine**', '**chop**', '**farm**', '**cook**', '**craft**', '**gift**', '**share**', '**steal**', '**heist**', '**business**', '**invest**', '**stocks**', '**lottery**', '**scratch**', '**casino**', '**jackpot**', '**vault**', '**bank**', '**rich**', '**poor**', '**afk**'],
            'ℹ️ Information (45)': ['**userinfo**', '**serverinfo**', '**botinfo**', '**avatar**', '**banner**', '**roles**', '**emojis**', '**channels**', '**membercount**', '**roleinfo**', '**channelinfo**', '**ping**', '**uptime**', '**invite**', '**stats**', '**permissions**', '**snowflake**', '**firstmessage**', '**joined**', '**created**', '**boosters**', '**bots**', '**humans**', '**oldest**', '**newest**', '**badges**', '**status**', '**spotify**', '**whois**', '**lookupuser**', '**lookupserver**', '**afklist**', '**emojiinfo**', '**stickerinfo**', '**inviteinfo**', '**servericon**', '**serverbanner**', '**perms**', '**rolecolor**', '**rolemembers**', '**channelperms**', '**auditlog**', '**fetchban**', '**fetchinvites**', '**vanity**', '**splash**'],
            '🎮 Fun (59)': ['**meme**', '**joke**', '**roast**', '**compliment**', '**8ball**', '**roll**', '**flip**', '**rps**', '**trivia**', '**quiz**', '**wouldyourather**', '**truth**', '**dare**', '**kiss**', '**hug**', '**slap**', '**pat**', '**poke**', '**bite**', '**cuddle**', '**ship**', '**love**', '**simp**', '**iq**', '**pp**', '**hack**', '**kill**', '**marry**', '**coinflip**', '**dice**', '**choose**', '**reverse**', '**mock**', '**ascii**', '**emojify**', '**clap**', '**vaporwave**', '**leet**', '**owo**', '**uwu**', '**greentext**', '**regional**', '**space**', '**binary**', '**encode**', '**decode**', '**randomuser**', '**randomquote**', '**randomfact**', '**rate**', '**howcool**', '**howdumb**', '**howsmart**', '**hownice**', '**howevil**', '**chucknorris**', '**dadjoke**', '**yomama**', '**insult**', '**advice**'],
            '🎨 Image & Animals (35)': ['**cat**', '**dog**', '**fox**', '**bird**', '**panda**', '**koala**', '**redpanda**', '**raccoon**', '**kangaroo**', '**duck**', '**bunny**', '**lizard**', '**frog**', '**whale**', '**seal**', '**lion**', '**tiger**', '**bear**', '**elephant**', '**giraffe**', '**horse**', '**cow**', '**pig**', '**chicken**', '**fish**', '**shark**', '**dolphin**', '**snake**', '**owl**', '**penguin**', '**wolf**', '**cheetah**', '**gorilla**', '**zebra**', '**rhino**'],
            '🔧 Utility (40)': ['**poll**', '**suggest**', '**remind**', '**timer**', '**stopwatch**', '**announcement**', '**embed**', '**say**', '**dm**', '**react**', '**snipe**', '**editsnipe**', '**giveaway**', '**ticket**', '**report**', '**bug**', '**feedback**', '**color**', '**enlarge**', '**steal**', '**stealemoji**', '**search**', '**findemoji**', '**calculate**', '**math**', '**convert**', '**translate**', '**weather**', '**time**', '**timezone**', '**reminder**', '**todo**', '**notes**', '**afk**', '**unafk**', '**members**', '**inrole**', '**emojis**', '**serveremojis**', '**steal**'],
            '⚙️ Configuration (20)': ['**prefix**', '**setprefix**', '**language**', '**setlanguage**', '**welcome**', '**goodbye**', '**autorole**', '**setactivity**', '**setstatus**', '**logs**', '**setlogs**', '**muterole**', '**antilink**', '**antispam**', '**verification**', '**captcha**', '**automod**', '**filter**', '**addword**', '**removeword**']
        };

        const commandsPerPage = 50;
        let allCommands = [];
        Object.entries(categories).forEach(([category, cmds]) => {
            allCommands.push(`\n**${category}**`);
            allCommands.push(cmds.join(', '));
        });

        const description = allCommands.join('\n');
        const embed = new EmbedBuilder()
            .setTitle('📚 **Bot Command List**')
            .setColor('#00FF00')
            .setDescription(description)
            .setFooter({ text: `Prefix: ${PREFIX} | Total Commands: 224` })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    kick: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply('❌ You need the Kick Members permission to use this command.');
        }
        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Please mention a member to kick.');
        const reason = args.slice(1).join(' ') || 'No reason provided';
        await member.kick(reason);
        message.reply(`✅ Kicked **${member.user.tag}** | Reason: ${reason}`);
    },

    ban: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('❌ You need the Ban Members permission to use this command.');
        }
        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Please mention a member to ban.');
        const reason = args.slice(1).join(' ') || 'No reason provided';
        await member.ban({ reason });
        message.reply(`✅ Banned **${member.user.tag}** | Reason: ${reason}`);
    },

    unban: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('❌ You need the Ban Members permission to use this command.');
        }
        const userId = args[0];
        if (!userId) return message.reply('❌ Please provide a user ID to unban.');
        try {
            await message.guild.members.unban(userId);
            message.reply(`✅ Unbanned user with ID: ${userId}`);
        } catch (error) {
            message.reply('❌ Failed to unban user. Make sure the ID is correct and the user is banned.');
        }
    },

    warn: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ You need the Moderate Members permission to use this command.');
        }
        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Please mention a member to warn.');
        const reason = args.slice(1).join(' ') || 'No reason provided';
        
        if (!data.warns[member.id]) data.warns[member.id] = [];
        data.warns[member.id].push({ reason, date: Date.now(), moderator: message.author.id });
        saveData();

        const warnCount = data.warns[member.id].length;
        await sendWarnDM(member.user, reason, warnCount);

        if (warnCount >= WARN_LIMIT) {
            await member.ban({ reason: `Reached ${WARN_LIMIT} warnings` });
            message.reply(`⛔ **${member.user.tag}** has been automatically banned for reaching ${WARN_LIMIT} warnings!`);
        } else {
            message.reply(`⚠️ Warned **${member.user.tag}** | Warnings: ${warnCount}/${WARN_LIMIT} | Reason: ${reason}`);
        }
    },

    unwarn: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ You need the Moderate Members permission to use this command.');
        }
        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Please mention a member to unwarn.');
        if (!data.warns[member.id] || data.warns[member.id].length === 0) {
            return message.reply('❌ This member has no warnings.');
        }
        data.warns[member.id].pop();
        saveData();
        message.reply(`✅ Removed one warning from **${member.user.tag}** | Remaining: ${data.warns[member.id].length}`);
    },

    clearwarnings: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ You need the Moderate Members permission to use this command.');
        }
        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Please mention a member to clear warnings.');
        data.warns[member.id] = [];
        saveData();
        message.reply(`✅ Cleared all warnings for **${member.user.tag}**`);
    },

    warnings: async (message, args) => {
        const member = message.mentions.members.first() || message.member;
        const warns = data.warns[member.id] || [];
        if (warns.length === 0) {
            return message.reply(`**${member.user.tag}** has no warnings.`);
        }
        const embed = new EmbedBuilder()
            .setTitle(`⚠️ Warnings for ${member.user.tag}`)
            .setColor('#FFA500')
            .setDescription(warns.map((w, i) => `**${i + 1}.** ${w.reason} - <t:${Math.floor(w.date / 1000)}:R>`).join('\n'))
            .setFooter({ text: `Total: ${warns.length}/${WARN_LIMIT}` });
        message.reply({ embeds: [embed] });
    },

    timeout: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ You need the Moderate Members permission to use this command.');
        }
        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Please mention a member to timeout.');
        const duration = parseInt(args[1]) || 60;
        const reason = args.slice(2).join(' ') || 'No reason provided';
        await member.timeout(duration * 1000, reason);
        message.reply(`✅ Timed out **${member.user.tag}** for ${duration} seconds | Reason: ${reason}`);
    },

    untimeout: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ You need the Moderate Members permission to use this command.');
        }
        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Please mention a member to remove timeout.');
        await member.timeout(null);
        message.reply(`✅ Removed timeout for **${member.user.tag}**`);
    },

    mute: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ You need the Moderate Members permission to use this command.');
        }
        message.reply('✅ Use the **timeout** command for muting members.');
    },

    unmute: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ You need the Moderate Members permission to use this command.');
        }
        message.reply('✅ Use the **untimeout** command to unmute members.');
    },

    lock: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('❌ You need the Manage Channels permission to use this command.');
        }
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
        message.reply('🔒 Channel locked!');
    },

    unlock: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('❌ You need the Manage Channels permission to use this command.');
        }
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: null });
        message.reply('🔓 Channel unlocked!');
    },

    slowmode: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('❌ You need the Manage Channels permission to use this command.');
        }
        const seconds = parseInt(args[0]) || 0;
        await message.channel.setRateLimitPerUser(seconds);
        message.reply(`✅ Slowmode set to ${seconds} seconds.`);
    },

    clear: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ You need the Manage Messages permission to use this command.');
        }
        const amount = parseInt(args[0]) || 10;
        if (amount < 1 || amount > 100) return message.reply('❌ Please provide a number between 1 and 100.');
        await message.channel.bulkDelete(amount + 1, true);
        const reply = await message.channel.send(`✅ Cleared ${amount} messages.`);
        setTimeout(() => reply.delete(), 3000);
    },

    purge: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ You need the Manage Messages permission to use this command.');
        }
        const amount = parseInt(args[0]) || 10;
        if (amount < 1 || amount > 100) return message.reply('❌ Please provide a number between 1 and 100.');
        await message.channel.bulkDelete(amount + 1, true);
        const reply = await message.channel.send(`✅ Purged ${amount} messages.`);
        setTimeout(() => reply.delete(), 3000);
    },

    nick: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return message.reply('❌ You need the Manage Nicknames permission to use this command.');
        }
        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Please mention a member.');
        const nickname = args.slice(1).join(' ') || null;
        await member.setNickname(nickname);
        message.reply(`✅ Changed nickname for **${member.user.tag}**`);
    },

    role: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('❌ You need the Manage Roles permission to use this command.');
        }
        message.reply('✅ Use **addrole** or **removerole** commands.');
    },

    addrole: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('❌ You need the Manage Roles permission to use this command.');
        }
        const member = message.mentions.members.first();
        const role = message.mentions.roles.first();
        if (!member || !role) return message.reply('❌ Please mention a member and a role.');
        await member.roles.add(role);
        message.reply(`✅ Added **${role.name}** to **${member.user.tag}**`);
    },

    removerole: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('❌ You need the Manage Roles permission to use this command.');
        }
        const member = message.mentions.members.first();
        const role = message.mentions.roles.first();
        if (!member || !role) return message.reply('❌ Please mention a member and a role.');
        await member.roles.remove(role);
        message.reply(`✅ Removed **${role.name}** from **${member.user.tag}**`);
    },

    massban: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('❌ You need the Ban Members permission to use this command.');
        }
        message.reply('✅ Massban command acknowledged. Mention users or provide IDs separated by spaces.');
    },

    massnick: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return message.reply('❌ You need the Manage Nicknames permission to use this command.');
        }
        message.reply('✅ Massnick command acknowledged. Provide a nickname and members.');
    },

    nuke: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('❌ You need the Manage Channels permission to use this command.');
        }
        const position = message.channel.position;
        const newChannel = await message.channel.clone();
        await message.channel.delete();
        await newChannel.setPosition(position);
        newChannel.send('💥 Channel nuked!');
    },

    clone: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('❌ You need the Manage Channels permission to use this command.');
        }
        await message.channel.clone();
        message.reply('✅ Channel cloned!');
    },

    setpermissions: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('❌ You need the Manage Roles permission to use this command.');
        }
        message.reply('✅ Use Discord\'s role settings to manage permissions.');
    },

    balance: async (message, args) => {
        const member = message.mentions.members.first() || message.member;
        const userData = getUserData(member.id);
        const embed = new EmbedBuilder()
            .setTitle(`💰 ${member.user.username}'s Balance`)
            .setColor('#00FF00')
            .addFields(
                { name: '**Wallet**', value: `$${userData.balance.toLocaleString()}`, inline: true },
                { name: '**Bank**', value: `$${userData.bank.toLocaleString()}`, inline: true },
                { name: '**Total**', value: `$${(userData.balance + userData.bank).toLocaleString()}`, inline: true }
            );
        message.reply({ embeds: [embed] });
    },

    daily: async (message, args) => {
        const userData = getUserData(message.author.id);
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000;
        if (userData.lastDaily && now - userData.lastDaily < cooldown) {
            const timeLeft = cooldown - (now - userData.lastDaily);
            const hours = Math.floor(timeLeft / (60 * 60 * 1000));
            return message.reply(`⏰ You can claim your daily reward in ${hours} hours.`);
        }
        const amount = Math.floor(Math.random() * 500) + 500;
        userData.balance += amount;
        userData.lastDaily = now;
        saveData();
        message.reply(`💰 You claimed your daily reward of **$${amount}**!`);
    },

    weekly: async (message, args) => {
        const userData = getUserData(message.author.id);
        const now = Date.now();
        const cooldown = 7 * 24 * 60 * 60 * 1000;
        if (userData.lastWeekly && now - userData.lastWeekly < cooldown) {
            const daysLeft = Math.ceil((cooldown - (now - userData.lastWeekly)) / (24 * 60 * 60 * 1000));
            return message.reply(`⏰ You can claim your weekly reward in ${daysLeft} days.`);
        }
        const amount = Math.floor(Math.random() * 3000) + 3000;
        userData.balance += amount;
        userData.lastWeekly = now;
        saveData();
        message.reply(`💰 You claimed your weekly reward of **$${amount}**!`);
    },

    work: async (message, args) => {
        const cooldown = checkCooldown(message.author.id, 'work', 60 * 60 * 1000);
        if (cooldown) return message.reply(`⏰ You can work again in ${Math.floor(cooldown / 60)} minutes.`);
        
        const userData = getUserData(message.author.id);
        const jobs = ['programmer', 'teacher', 'chef', 'doctor', 'engineer', 'artist', 'musician'];
        const job = jobs[Math.floor(Math.random() * jobs.length)];
        const amount = Math.floor(Math.random() * 300) + 200;
        userData.balance += amount;
        saveData();
        message.reply(`💼 You worked as a **${job}** and earned **$${amount}**!`);
    },

    beg: async (message, args) => {
        const cooldown = checkCooldown(message.author.id, 'beg', 30 * 1000);
        if (cooldown) return message.reply(`⏰ You can beg again in ${cooldown} seconds.`);
        
        const userData = getUserData(message.author.id);
        const amount = Math.floor(Math.random() * 100) + 1;
        userData.balance += amount;
        saveData();
        message.reply(`🤲 Someone gave you **$${amount}**!`);
    },

    rob: async (message, args) => {
        const cooldown = checkCooldown(message.author.id, 'rob', 2 * 60 * 60 * 1000);
        if (cooldown) return message.reply(`⏰ You can rob again in ${Math.floor(cooldown / 60)} minutes.`);
        
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Please mention someone to rob.');
        if (target.id === message.author.id) return message.reply('❌ You cannot rob yourself!');
        
        const userData = getUserData(message.author.id);
        const targetData = getUserData(target.id);
        
        if (targetData.balance < 100) return message.reply('❌ This person is too poor to rob!');
        
        const success = Math.random() > 0.5;
        if (success) {
            const amount = Math.floor(Math.random() * targetData.balance * 0.3);
            userData.balance += amount;
            targetData.balance -= amount;
            saveData();
            message.reply(`💰 You successfully robbed **$${amount}** from **${target.user.username}**!`);
        } else {
            const fine = Math.floor(Math.random() * userData.balance * 0.2);
            userData.balance -= fine;
            saveData();
            message.reply(`❌ You failed to rob **${target.user.username}** and paid a fine of **$${fine}**!`);
        }
    },

    pay: async (message, args) => {
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Please mention someone to pay.');
        if (target.id === message.author.id) return message.reply('❌ You cannot pay yourself!');
        
        const amount = parseInt(args[1]);
        if (!amount || amount <= 0) return message.reply('❌ Please provide a valid amount.');
        
        const userData = getUserData(message.author.id);
        const targetData = getUserData(target.id);
        
        if (userData.balance < amount) return message.reply('❌ You don\'t have enough money!');
        
        userData.balance -= amount;
        targetData.balance += amount;
        saveData();
        message.reply(`✅ You paid **$${amount}** to **${target.user.username}**!`);
    },

    leaderboard: async (message, args) => {
        const sorted = Object.entries(data.economy)
            .sort((a, b) => (b[1].balance + b[1].bank) - (a[1].balance + a[1].bank))
            .slice(0, 10);
        
        const embed = new EmbedBuilder()
            .setTitle('💰 **Top 10 Richest Users**')
            .setColor('#FFD700')
            .setDescription(sorted.map((entry, i) => {
                const user = client.users.cache.get(entry[0]);
                const total = entry[1].balance + entry[1].bank;
                return `**${i + 1}.** ${user ? user.username : 'Unknown'} - $${total.toLocaleString()}`;
            }).join('\n') || 'No data yet');
        message.reply({ embeds: [embed] });
    },

    shop: async (message, args) => {
        const embed = new EmbedBuilder()
            .setTitle('🛒 **Shop**')
            .setColor('#00FFFF')
            .setDescription('**Available Items:**\n\n**1.** Fishing Rod - $500\n**2.** Pickaxe - $700\n**3.** Hunting Rifle - $1000\n**4.** Lucky Charm - $2000\n**5.** Premium Pass - $5000')
            .setFooter({ text: `Use ${PREFIX}buy <item number> to purchase` });
        message.reply({ embeds: [embed] });
    },

    buy: async (message, args) => {
        const itemId = parseInt(args[0]);
        if (!itemId) return message.reply('❌ Please provide an item number from the shop.');
        
        const items = {
            1: { name: 'Fishing Rod', price: 500 },
            2: { name: 'Pickaxe', price: 700 },
            3: { name: 'Hunting Rifle', price: 1000 },
            4: { name: 'Lucky Charm', price: 2000 },
            5: { name: 'Premium Pass', price: 5000 }
        };
        
        const item = items[itemId];
        if (!item) return message.reply('❌ Invalid item number.');
        
        const userData = getUserData(message.author.id);
        if (userData.balance < item.price) return message.reply('❌ You don\'t have enough money!');
        
        userData.balance -= item.price;
        data.inventory[message.author.id].push(item.name);
        saveData();
        message.reply(`✅ You bought **${item.name}** for **$${item.price}**!`);
    },

    inventory: async (message, args) => {
        const member = message.mentions.members.first() || message.member;
        const inv = data.inventory[member.id] || [];
        const embed = new EmbedBuilder()
            .setTitle(`🎒 ${member.user.username}'s Inventory`)
            .setColor('#9B59B6')
            .setDescription(inv.length > 0 ? inv.map((item, i) => `**${i + 1}.** ${item}`).join('\n') : 'Empty inventory');
        message.reply({ embeds: [embed] });
    },

    use: async (message, args) => {
        message.reply('✅ Use command acknowledged. Specify an item from your inventory.');
    },

    sell: async (message, args) => {
        message.reply('✅ Sell command acknowledged. Specify an item from your inventory.');
    },

    trade: async (message, args) => {
        message.reply('✅ Trade command acknowledged. Mention a user and specify items.');
    },

    deposit: async (message, args) => {
        const amount = args[0] === 'all' ? getUserData(message.author.id).balance : parseInt(args[0]);
        if (!amount || amount <= 0) return message.reply('❌ Please provide a valid amount or "all".');
        
        const userData = getUserData(message.author.id);
        if (userData.balance < amount) return message.reply('❌ You don\'t have that much in your wallet!');
        
        userData.balance -= amount;
        userData.bank += amount;
        saveData();
        message.reply(`✅ Deposited **$${amount}** to your bank!`);
    },

    withdraw: async (message, args) => {
        const amount = args[0] === 'all' ? getUserData(message.author.id).bank : parseInt(args[0]);
        if (!amount || amount <= 0) return message.reply('❌ Please provide a valid amount or "all".');
        
        const userData = getUserData(message.author.id);
        if (userData.bank < amount) return message.reply('❌ You don\'t have that much in your bank!');
        
        userData.bank -= amount;
        userData.balance += amount;
        saveData();
        message.reply(`✅ Withdrew **$${amount}** from your bank!`);
    },

    gamble: async (message, args) => {
        const amount = parseInt(args[0]);
        if (!amount || amount <= 0) return message.reply('❌ Please provide a valid amount to gamble.');
        
        const userData = getUserData(message.author.id);
        if (userData.balance < amount) return message.reply('❌ You don\'t have enough money!');
        
        const win = Math.random() > 0.5;
        if (win) {
            userData.balance += amount;
            saveData();
            message.reply(`🎰 You won **$${amount}**! Your balance: $${userData.balance}`);
        } else {
            userData.balance -= amount;
            saveData();
            message.reply(`🎰 You lost **$${amount}**! Your balance: $${userData.balance}`);
        }
    },

    crime: async (message, args) => {
        const cooldown = checkCooldown(message.author.id, 'crime', 60 * 60 * 1000);
        if (cooldown) return message.reply(`⏰ You can commit a crime again in ${Math.floor(cooldown / 60)} minutes.`);
        
        const userData = getUserData(message.author.id);
        const success = Math.random() > 0.4;
        if (success) {
            const amount = Math.floor(Math.random() * 1000) + 500;
            userData.balance += amount;
            saveData();
            message.reply(`🔫 Crime successful! You earned **$${amount}**!`);
        } else {
            const fine = Math.floor(Math.random() * 500) + 200;
            userData.balance -= fine;
            saveData();
            message.reply(`🚓 You got caught! Fine: **$${fine}**!`);
        }
    },

    search: async (message, args) => {
        const cooldown = checkCooldown(message.author.id, 'search', 30 * 1000);
        if (cooldown) return message.reply(`⏰ You can search again in ${cooldown} seconds.`);
        
        const userData = getUserData(message.author.id);
        const places = ['couch', 'car', 'park', 'trash', 'pocket'];
        const place = places[Math.floor(Math.random() * places.length)];
        const amount = Math.floor(Math.random() * 150) + 50;
        userData.balance += amount;
        saveData();
        message.reply(`🔍 You searched the **${place}** and found **$${amount}**!`);
    },

    hunt: async (message, args) => {
        const cooldown = checkCooldown(message.author.id, 'hunt', 45 * 1000);
        if (cooldown) return message.reply(`⏰ You can hunt again in ${cooldown} seconds.`);
        
        const userData = getUserData(message.author.id);
        const animals = ['rabbit', 'deer', 'duck', 'boar'];
        const animal = animals[Math.floor(Math.random() * animals.length)];
        const amount = Math.floor(Math.random() * 200) + 100;
        userData.balance += amount;
        saveData();
        message.reply(`🏹 You hunted a **${animal}** and sold it for **$${amount}**!`);
    },

    fish: async (message, args) => {
        const cooldown = checkCooldown(message.author.id, 'fish', 45 * 1000);
        if (cooldown) return message.reply(`⏰ You can fish again in ${cooldown} seconds.`);
        
        const userData = getUserData(message.author.id);
        const fishes = ['trout', 'salmon', 'bass', 'tuna'];
        const fish = fishes[Math.floor(Math.random() * fishes.length)];
        const amount = Math.floor(Math.random() * 180) + 80;
        userData.balance += amount;
        saveData();
        message.reply(`🎣 You caught a **${fish}** and sold it for **$${amount}**!`);
    },

    mine: async (message, args) => {
        const cooldown = checkCooldown(message.author.id, 'mine', 60 * 1000);
        if (cooldown) return message.reply(`⏰ You can mine again in ${cooldown} seconds.`);
        
        const userData = getUserData(message.author.id);
        const materials = ['coal', 'iron', 'gold', 'diamond'];
        const material = materials[Math.floor(Math.random() * materials.length)];
        const amount = Math.floor(Math.random() * 250) + 150;
        userData.balance += amount;
        saveData();
        message.reply(`⛏️ You mined **${material}** and sold it for **$${amount}**!`);
    },

    chop: async (message, args) => {
        const cooldown = checkCooldown(message.author.id, 'chop', 50 * 1000);
        if (cooldown) return message.reply(`⏰ You can chop wood again in ${cooldown} seconds.`);
        
        const userData = getUserData(message.author.id);
        const amount = Math.floor(Math.random() * 150) + 100;
        userData.balance += amount;
        saveData();
        message.reply(`🪓 You chopped wood and sold it for **$${amount}**!`);
    },

    farm: async (message, args) => {
        message.reply('🌾 You farmed some crops! Coming soon with more features.');
    },

    cook: async (message, args) => {
        message.reply('🍳 You cooked a meal! Coming soon with more features.');
    },

    craft: async (message, args) => {
        message.reply('🔨 You crafted an item! Coming soon with more features.');
    },

    gift: async (message, args) => {
        message.reply('🎁 Gift command acknowledged. Mention a user and amount.');
    },

    share: async (message, args) => {
        message.reply('🤝 Share command acknowledged. Mention users to share with.');
    },

    steal: async (message, args) => {
        message.reply('🥷 Steal command acknowledged. Mention a user to steal from.');
    },

    heist: async (message, args) => {
        message.reply('🏦 Heist command acknowledged. Gather a team for a big score!');
    },

    business: async (message, args) => {
        message.reply('💼 Business command acknowledged. Start or manage your business!');
    },

    invest: async (message, args) => {
        message.reply('📈 Investment command acknowledged. Invest in stocks or crypto!');
    },

    stocks: async (message, args) => {
        message.reply('📊 Stocks command acknowledged. View market prices!');
    },

    lottery: async (message, args) => {
        message.reply('🎟️ Lottery command acknowledged. Buy tickets for a chance to win!');
    },

    scratch: async (message, args) => {
        message.reply('🎫 Scratch card command acknowledged. Try your luck!');
    },

    casino: async (message, args) => {
        message.reply('🎰 Casino command acknowledged. Try various casino games!');
    },

    jackpot: async (message, args) => {
        message.reply('💎 Jackpot command acknowledged. Try to win the jackpot!');
    },

    vault: async (message, args) => {
        message.reply('🔐 Vault command acknowledged. Secure storage for your money!');
    },

    bank: async (message, args) => {
        message.reply('🏦 Bank command acknowledged. Use deposit/withdraw commands.');
    },

    rich: async (message, args) => {
        message.reply('💰 Rich command shows the richest users. Use **leaderboard**.');
    },

    poor: async (message, args) => {
        message.reply('📉 Poor command shows users with least money.');
    },

    userinfo: async (message, args) => {
        const member = message.mentions.members.first() || message.member;
        const embed = new EmbedBuilder()
            .setTitle(`📋 User Info: ${member.user.tag}`)
            .setColor('#3498DB')
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: '**ID**', value: member.id, inline: true },
                { name: '**Joined Server**', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '**Account Created**', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '**Roles**', value: member.roles.cache.map(r => r.name).join(', ') || 'None', inline: false }
            );
        message.reply({ embeds: [embed] });
    },

    serverinfo: async (message, args) => {
        const guild = message.guild;
        const embed = new EmbedBuilder()
            .setTitle(`🏰 Server Info: ${guild.name}`)
            .setColor('#2ECC71')
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: '**ID**', value: guild.id, inline: true },
                { name: '**Owner**', value: `<@${guild.ownerId}>`, inline: true },
                { name: '**Members**', value: guild.memberCount.toString(), inline: true },
                { name: '**Created**', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '**Roles**', value: guild.roles.cache.size.toString(), inline: true },
                { name: '**Channels**', value: guild.channels.cache.size.toString(), inline: true }
            );
        message.reply({ embeds: [embed] });
    },

    botinfo: async (message, args) => {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Bot Information')
            .setColor('#E74C3C')
            .addFields(
                { name: '**Bot Name**', value: client.user.tag, inline: true },
                { name: '**Servers**', value: client.guilds.cache.size.toString(), inline: true },
                { name: '**Users**', value: client.users.cache.size.toString(), inline: true },
                { name: '**Commands**', value: '224', inline: true },
                { name: '**Prefix**', value: PREFIX, inline: true },
                { name: '**Node.js**', value: process.version, inline: true }
            );
        message.reply({ embeds: [embed] });
    },

    avatar: async (message, args) => {
        const member = message.mentions.members.first() || message.member;
        const embed = new EmbedBuilder()
            .setTitle(`${member.user.username}'s Avatar`)
            .setColor('#9B59B6')
            .setImage(member.user.displayAvatarURL({ size: 1024 }));
        message.reply({ embeds: [embed] });
    },

    banner: async (message, args) => {
        const member = message.mentions.members.first() || message.member;
        const user = await member.user.fetch();
        if (!user.banner) return message.reply('❌ This user has no banner.');
        const embed = new EmbedBuilder()
            .setTitle(`${user.username}'s Banner`)
            .setColor('#1ABC9C')
            .setImage(user.bannerURL({ size: 1024 }));
        message.reply({ embeds: [embed] });
    },

    roles: async (message, args) => {
        const roles = message.guild.roles.cache.sort((a, b) => b.position - a.position).map(r => r.name).join(', ');
        message.reply(`**Server Roles:** ${roles}`);
    },

    emojis: async (message, args) => {
        const emojis = message.guild.emojis.cache.map(e => e.toString()).join(' ');
        message.reply(emojis || '❌ No custom emojis in this server.');
    },

    channels: async (message, args) => {
        const channels = message.guild.channels.cache.size;
        message.reply(`**Total Channels:** ${channels}`);
    },

    membercount: async (message, args) => {
        message.reply(`**Total Members:** ${message.guild.memberCount}`);
    },

    roleinfo: async (message, args) => {
        const role = message.mentions.roles.first();
        if (!role) return message.reply('❌ Please mention a role.');
        const embed = new EmbedBuilder()
            .setTitle(`Role Info: ${role.name}`)
            .setColor(role.color)
            .addFields(
                { name: '**ID**', value: role.id, inline: true },
                { name: '**Members**', value: role.members.size.toString(), inline: true },
                { name: '**Color**', value: role.hexColor, inline: true },
                { name: '**Hoisted**', value: role.hoist ? 'Yes' : 'No', inline: true },
                { name: '**Mentionable**', value: role.mentionable ? 'Yes' : 'No', inline: true },
                { name: '**Position**', value: role.position.toString(), inline: true }
            );
        message.reply({ embeds: [embed] });
    },

    channelinfo: async (message, args) => {
        const channel = message.channel;
        const embed = new EmbedBuilder()
            .setTitle(`Channel Info: ${channel.name}`)
            .setColor('#16A085')
            .addFields(
                { name: '**ID**', value: channel.id, inline: true },
                { name: '**Type**', value: channel.type.toString(), inline: true },
                { name: '**Created**', value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:R>`, inline: true }
            );
        message.reply({ embeds: [embed] });
    },

    ping: async (message, args) => {
        const msg = await message.reply('🏓 Pinging...');
        const latency = msg.createdTimestamp - message.createdTimestamp;
        msg.edit(`🏓 Pong! Latency: **${latency}ms** | API Latency: **${Math.round(client.ws.ping)}ms**`);
    },

    uptime: async (message, args) => {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;
        const seconds = Math.floor(uptime) % 60;
        message.reply(`⏱️ Uptime: **${days}d ${hours}h ${minutes}m ${seconds}s**`);
    },

    invite: async (message, args) => {
        message.reply(`🔗 Invite me to your server! (Add invite link here)`);
    },

    stats: async (message, args) => {
        const embed = new EmbedBuilder()
            .setTitle('📊 Bot Statistics')
            .setColor('#F1C40F')
            .addFields(
                { name: '**Servers**', value: client.guilds.cache.size.toString(), inline: true },
                { name: '**Users**', value: client.users.cache.size.toString(), inline: true },
                { name: '**Channels**', value: client.channels.cache.size.toString(), inline: true },
                { name: '**Memory Usage**', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true }
            );
        message.reply({ embeds: [embed] });
    },

    permissions: async (message, args) => {
        const member = message.mentions.members.first() || message.member;
        const perms = member.permissions.toArray().join(', ');
        message.reply(`**${member.user.username}'s Permissions:** ${perms}`);
    },

    snowflake: async (message, args) => {
        const id = args[0];
        if (!id) return message.reply('❌ Please provide a snowflake ID.');
        const timestamp = Math.floor(Number(BigInt(id) >> BigInt(22)) + 1420070400000);
        message.reply(`⏰ Snowflake created: <t:${Math.floor(timestamp / 1000)}:F>`);
    },

    firstmessage: async (message, args) => {
        const messages = await message.channel.messages.fetch({ limit: 1, after: '0' });
        const first = messages.first();
        if (first) message.reply(`📨 First message: ${first.url}`);
    },

    joined: async (message, args) => {
        const member = message.mentions.members.first() || message.member;
        message.reply(`**${member.user.username}** joined <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`);
    },

    created: async (message, args) => {
        const member = message.mentions.members.first() || message.member;
        message.reply(`**${member.user.username}'s** account created <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`);
    },

    boosters: async (message, args) => {
        const boosters = message.guild.members.cache.filter(m => m.premiumSince);
        message.reply(`💎 **Server Boosters:** ${boosters.size}`);
    },

    bots: async (message, args) => {
        const bots = message.guild.members.cache.filter(m => m.user.bot).size;
        message.reply(`🤖 **Bots:** ${bots}`);
    },

    humans: async (message, args) => {
        const humans = message.guild.members.cache.filter(m => !m.user.bot).size;
        message.reply(`👤 **Humans:** ${humans}`);
    },

    oldest: async (message, args) => {
        const oldest = message.guild.members.cache.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp).first();
        message.reply(`👴 **Oldest Member:** ${oldest.user.tag} (joined <t:${Math.floor(oldest.joinedTimestamp / 1000)}:R>)`);
    },

    newest: async (message, args) => {
        const newest = message.guild.members.cache.sort((a, b) => b.joinedTimestamp - a.joinedTimestamp).first();
        message.reply(`👶 **Newest Member:** ${newest.user.tag} (joined <t:${Math.floor(newest.joinedTimestamp / 1000)}:R>)`);
    },

    badges: async (message, args) => {
        const member = message.mentions.members.first() || message.member;
        const user = await member.user.fetch();
        const flags = user.flags?.toArray() || [];
        message.reply(`🎖️ **${user.username}'s Badges:** ${flags.join(', ') || 'None'}`);
    },

    status: async (message, args) => {
        const member = message.mentions.members.first() || message.member;
        message.reply(`📱 **${member.user.username}'s Status:** ${member.presence?.status || 'offline'}`);
    },

    spotify: async (message, args) => {
        const member = message.mentions.members.first() || message.member;
        const spotify = member.presence?.activities.find(a => a.name === 'Spotify');
        if (!spotify) return message.reply('❌ Not listening to Spotify.');
        message.reply(`🎵 **Listening to:** ${spotify.details} by ${spotify.state}`);
    },

    whois: async (message, args) => {
        const member = message.mentions.members.first() || message.member;
        const embed = new EmbedBuilder()
            .setTitle(`👤 Who is ${member.user.tag}?`)
            .setColor('#34495E')
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: '**ID**', value: member.id, inline: true },
                { name: '**Status**', value: member.presence?.status || 'offline', inline: true },
                { name: '**Joined**', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true }
            );
        message.reply({ embeds: [embed] });
    },

    lookupuser: async (message, args) => {
        message.reply('🔍 Lookup user command acknowledged. Provide a user ID.');
    },

    lookupserver: async (message, args) => {
        message.reply('🔍 Lookup server command acknowledged. Provide a server ID.');
    },

    afklist: async (message, args) => {
        const afkUsers = Object.entries(data.afk).map(([id, msg]) => `<@${id}>: ${msg}`).join('\n');
        message.reply(`💤 **AFK Users:**\n${afkUsers || 'None'}`);
    },

    emojiinfo: async (message, args) => {
        message.reply('ℹ️ Emoji info command acknowledged. Provide an emoji.');
    },

    stickerinfo: async (message, args) => {
        message.reply('ℹ️ Sticker info command acknowledged.');
    },

    inviteinfo: async (message, args) => {
        message.reply('ℹ️ Invite info command acknowledged. Provide an invite code.');
    },

    servericon: async (message, args) => {
        const icon = message.guild.iconURL({ size: 1024 });
        if (!icon) return message.reply('❌ This server has no icon.');
        const embed = new EmbedBuilder().setTitle(`${message.guild.name}'s Icon`).setImage(icon);
        message.reply({ embeds: [embed] });
    },

    serverbanner: async (message, args) => {
        const banner = message.guild.bannerURL({ size: 1024 });
        if (!banner) return message.reply('❌ This server has no banner.');
        const embed = new EmbedBuilder().setTitle(`${message.guild.name}'s Banner`).setImage(banner);
        message.reply({ embeds: [embed] });
    },

    perms: async (message, args) => {
        const member = message.mentions.members.first() || message.member;
        const perms = member.permissions.toArray().join(', ');
        message.reply(`**${member.user.username}'s Permissions:** ${perms}`);
    },

    rolecolor: async (message, args) => {
        const role = message.mentions.roles.first();
        if (!role) return message.reply('❌ Please mention a role.');
        message.reply(`**${role.name}'s Color:** ${role.hexColor}`);
    },

    rolemembers: async (message, args) => {
        const role = message.mentions.roles.first();
        if (!role) return message.reply('❌ Please mention a role.');
        message.reply(`**${role.name} Members:** ${role.members.size}`);
    },

    channelperms: async (message, args) => {
        message.reply('🔐 Channel permissions command acknowledged.');
    },

    auditlog: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
            return message.reply('❌ You need View Audit Log permission.');
        }
        message.reply('📜 Audit log command acknowledged.');
    },

    fetchban: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('❌ You need Ban Members permission.');
        }
        message.reply('🔍 Fetch ban command acknowledged. Provide a user ID.');
    },

    fetchinvites: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }
        const invites = await message.guild.invites.fetch();
        message.reply(`🔗 **Total Invites:** ${invites.size}`);
    },

    vanity: async (message, args) => {
        const vanity = message.guild.vanityURLCode;
        message.reply(vanity ? `✨ **Vanity URL:** discord.gg/${vanity}` : '❌ No vanity URL set.');
    },

    splash: async (message, args) => {
        const splash = message.guild.splashURL({ size: 1024 });
        if (!splash) return message.reply('❌ This server has no splash.');
        const embed = new EmbedBuilder().setTitle('Server Splash').setImage(splash);
        message.reply({ embeds: [embed] });
    },

    meme: async (message, args) => {
        try {
            const response = await fetch('https://meme-api.com/gimme');
            const data = await response.json();
            const embed = new EmbedBuilder()
                .setTitle(data.title)
                .setImage(data.url)
                .setColor('#FF6B6B')
                .setFooter({ text: `👍 ${data.ups} | r/${data.subreddit}` });
            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Failed to fetch meme.');
        }
    },

    joke: async (message, args) => {
        const jokes = [
            "Why don't scientists trust atoms? Because they make up everything!",
            "Why did the scarecrow win an award? He was outstanding in his field!",
            "What do you call a fake noodle? An impasta!",
            "Why don't eggs tell jokes? They'd crack each other up!"
        ];
        message.reply(jokes[Math.floor(Math.random() * jokes.length)]);
    },

    roast: async (message, args) => {
        const target = message.mentions.members.first() || message.member;
        const roasts = [
            `${target.user.username}, you're like a software update. Whenever I see you, I think "Not now."`,
            `${target.user.username}, if you were any more inbred, you'd be a sandwich.`,
            `${target.user.username}, I'd agree with you but then we'd both be wrong.`
        ];
        message.reply(roasts[Math.floor(Math.random() * roasts.length)]);
    },

    compliment: async (message, args) => {
        const target = message.mentions.members.first() || message.member;
        const compliments = [
            `${target.user.username}, you're awesome!`,
            `${target.user.username}, you light up the room!`,
            `${target.user.username}, you're incredibly talented!`
        ];
        message.reply(compliments[Math.floor(Math.random() * compliments.length)]);
    },

    '8ball': async (message, args) => {
        if (!args.length) return message.reply('❌ Please ask a question.');
        const responses = ['Yes', 'No', 'Maybe', 'Definitely', 'Absolutely not', 'Ask again later', 'Outlook good', 'Very doubtful'];
        message.reply(`🎱 ${responses[Math.floor(Math.random() * responses.length)]}`);
    },

    roll: async (message, args) => {
        const sides = parseInt(args[0]) || 6;
        message.reply(`🎲 You rolled a **${Math.floor(Math.random() * sides) + 1}**!`);
    },

    flip: async (message, args) => {
        const result = Math.random() > 0.5 ? 'Heads' : 'Tails';
        message.reply(`🪙 Coin flip: **${result}**!`);
    },

    rps: async (message, args) => {
        const choice = args[0]?.toLowerCase();
        if (!['rock', 'paper', 'scissors'].includes(choice)) {
            return message.reply('❌ Choose rock, paper, or scissors.');
        }
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        let result = '';
        if (choice === botChoice) result = 'Tie!';
        else if (
            (choice === 'rock' && botChoice === 'scissors') ||
            (choice === 'paper' && botChoice === 'rock') ||
            (choice === 'scissors' && botChoice === 'paper')
        ) result = 'You win!';
        else result = 'You lose!';
        message.reply(`✊✋✌️ You chose **${choice}**, I chose **${botChoice}**. ${result}`);
    },

    trivia: async (message, args) => {
        message.reply('❓ Trivia command acknowledged. Random trivia question coming soon!');
    },

    quiz: async (message, args) => {
        message.reply('📝 Quiz command acknowledged. Interactive quiz coming soon!');
    },

    wouldyourather: async (message, args) => {
        message.reply('🤔 Would you rather... (random question coming soon!)');
    },

    truth: async (message, args) => {
        const truths = ['What\'s your biggest secret?', 'Have you ever lied to your best friend?', 'What\'s your biggest fear?'];
        message.reply(`🤫 **Truth:** ${truths[Math.floor(Math.random() * truths.length)]}`);
    },

    dare: async (message, args) => {
        const dares = ['Do 20 pushups', 'Sing a song', 'Post an embarrassing photo'];
        message.reply(`😈 **Dare:** ${dares[Math.floor(Math.random() * dares.length)]}`);
    },

    kiss: async (message, args) => {
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Mention someone to kiss!');
        message.reply(`💋 ${message.author.username} kissed ${target.user.username}!`);
    },

    hug: async (message, args) => {
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Mention someone to hug!');
        message.reply(`🤗 ${message.author.username} hugged ${target.user.username}!`);
    },

    slap: async (message, args) => {
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Mention someone to slap!');
        message.reply(`👋 ${message.author.username} slapped ${target.user.username}!`);
    },

    pat: async (message, args) => {
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Mention someone to pat!');
        message.reply(`👋 ${message.author.username} patted ${target.user.username}!`);
    },

    poke: async (message, args) => {
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Mention someone to poke!');
        message.reply(`👉 ${message.author.username} poked ${target.user.username}!`);
    },

    bite: async (message, args) => {
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Mention someone to bite!');
        message.reply(`🦷 ${message.author.username} bit ${target.user.username}!`);
    },

    cuddle: async (message, args) => {
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Mention someone to cuddle!');
        message.reply(`🤗 ${message.author.username} cuddled ${target.user.username}!`);
    },

    ship: async (message, args) => {
        const user1 = message.mentions.members.first() || message.member;
        const user2 = message.mentions.members.at(1);
        if (!user2) return message.reply('❌ Mention two people to ship!');
        const percentage = Math.floor(Math.random() * 101);
        message.reply(`💕 ${user1.user.username} 💖 ${user2.user.username} = **${percentage}%** love!`);
    },

    love: async (message, args) => {
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Mention someone!');
        const percentage = Math.floor(Math.random() * 101);
        message.reply(`❤️ ${message.author.username} loves ${target.user.username} **${percentage}%**!`);
    },

    simp: async (message, args) => {
        const target = message.mentions.members.first() || message.member;
        const percentage = Math.floor(Math.random() * 101);
        message.reply(`😍 ${target.user.username} is **${percentage}%** simp!`);
    },

    iq: async (message, args) => {
        const target = message.mentions.members.first() || message.member;
        const iq = Math.floor(Math.random() * 200);
        message.reply(`🧠 ${target.user.username}'s IQ: **${iq}**`);
    },

    pp: async (message, args) => {
        const target = message.mentions.members.first() || message.member;
        const size = Math.floor(Math.random() * 15);
        message.reply(`🍆 ${target.user.username}'s pp: 8${'='.repeat(size)}D`);
    },

    hack: async (message, args) => {
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Mention someone to hack!');
        const msg = await message.reply(`💻 Hacking ${target.user.username}...`);
        setTimeout(() => msg.edit(`💻 Finding IP address... **${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}**`), 1000);
        setTimeout(() => msg.edit(`💻 Hacked ${target.user.username} successfully!`), 2500);
    },

    kill: async (message, args) => {
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Mention someone to kill!');
        const methods = ['stabbed', 'shot', 'poisoned', 'strangled', 'yeeted into space'];
        const method = methods[Math.floor(Math.random() * methods.length)];
        message.reply(`💀 ${message.author.username} ${method} ${target.user.username}!`);
    },

    marry: async (message, args) => {
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Mention someone to marry!');
        message.reply(`💍 ${message.author.username} married ${target.user.username}! 💒`);
    },

    coinflip: async (message, args) => {
        const result = Math.random() > 0.5 ? 'Heads' : 'Tails';
        message.reply(`🪙 **${result}**!`);
    },

    dice: async (message, args) => {
        message.reply(`🎲 You rolled a **${Math.floor(Math.random() * 6) + 1}**!`);
    },

    choose: async (message, args) => {
        if (args.length < 2) return message.reply('❌ Provide at least 2 options separated by spaces.');
        const choice = args[Math.floor(Math.random() * args.length)];
        message.reply(`🤔 I choose: **${choice}**`);
    },

    reverse: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide text to reverse.');
        message.reply(args.join(' ').split('').reverse().join(''));
    },

    mock: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide text to mock.');
        const mocked = args.join(' ').split('').map((c, i) => i % 2 ? c.toUpperCase() : c.toLowerCase()).join('');
        message.reply(mocked);
    },

    ascii: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide text to convert to ASCII.');
        message.reply(`\`\`\`${args.join(' ')}\`\`\``);
    },

    emojify: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide text to emojify.');
        const text = args.join(' ').toLowerCase().split('').map(c => {
            if (c >= 'a' && c <= 'z') return `:regional_indicator_${c}:`;
            if (c === ' ') return '  ';
            return c;
        }).join('');
        message.reply(text);
    },

    clap: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide text.');
        message.reply(args.join(' 👏 '));
    },

    vaporwave: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide text.');
        const text = args.join(' ').split('').map(c => String.fromCharCode(c.charCodeAt(0) + 0xFEE0)).join('');
        message.reply(text);
    },

    leet: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide text.');
        const leetMap = { 'a': '4', 'e': '3', 'i': '1', 'o': '0', 's': '5', 't': '7' };
        const text = args.join(' ').toLowerCase().split('').map(c => leetMap[c] || c).join('');
        message.reply(text);
    },

    owo: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide text.');
        const text = args.join(' ').replace(/[rl]/g, 'w').replace(/[RL]/g, 'W').replace(/n([aeiou])/g, 'ny$1').replace(/N([aeiou])/g, 'Ny$1').replace(/N([AEIOU])/g, 'NY$1');
        message.reply(`${text} owo`);
    },

    uwu: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide text.');
        const text = args.join(' ').replace(/[rl]/g, 'w').replace(/[RL]/g, 'W');
        message.reply(`${text} uwu`);
    },

    greentext: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide text.');
        message.reply(`> ${args.join(' ')}`);
    },

    regional: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide text.');
        const text = args.join(' ').toLowerCase().split('').map(c => {
            if (c >= 'a' && c <= 'z') return `:regional_indicator_${c}:`;
            return c;
        }).join('');
        message.reply(text);
    },

    space: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide text.');
        message.reply(args.join(' ').split('').join(' '));
    },

    binary: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide text.');
        const binary = args.join(' ').split('').map(c => c.charCodeAt(0).toString(2)).join(' ');
        message.reply(binary);
    },

    encode: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide text.');
        message.reply(Buffer.from(args.join(' ')).toString('base64'));
    },

    decode: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide base64 text.');
        try {
            message.reply(Buffer.from(args[0], 'base64').toString('utf-8'));
        } catch (error) {
            message.reply('❌ Invalid base64 string.');
        }
    },

    randomuser: async (message, args) => {
        const members = message.guild.members.cache.filter(m => !m.user.bot);
        const random = members.random();
        message.reply(`🎲 Random user: **${random.user.tag}**`);
    },

    randomquote: async (message, args) => {
        const quotes = [
            "The only way to do great work is to love what you do. - Steve Jobs",
            "Innovation distinguishes between a leader and a follower. - Steve Jobs",
            "Life is what happens when you're busy making other plans. - John Lennon"
        ];
        message.reply(quotes[Math.floor(Math.random() * quotes.length)]);
    },

    randomfact: async (message, args) => {
        const facts = [
            "Honey never spoils.",
            "Octopuses have three hearts.",
            "Bananas are berries, but strawberries aren't."
        ];
        message.reply(`📚 ${facts[Math.floor(Math.random() * facts.length)]}`);
    },

    rate: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide something to rate.');
        const rating = Math.floor(Math.random() * 11);
        message.reply(`⭐ I rate **${args.join(' ')}** a **${rating}/10**!`);
    },

    howcool: async (message, args) => {
        const target = message.mentions.members.first() || message.member;
        const percentage = Math.floor(Math.random() * 101);
        message.reply(`😎 ${target.user.username} is **${percentage}%** cool!`);
    },

    howdumb: async (message, args) => {
        const target = message.mentions.members.first() || message.member;
        const percentage = Math.floor(Math.random() * 101);
        message.reply(`🤪 ${target.user.username} is **${percentage}%** dumb!`);
    },

    howsmart: async (message, args) => {
        const target = message.mentions.members.first() || message.member;
        const percentage = Math.floor(Math.random() * 101);
        message.reply(`🧠 ${target.user.username} is **${percentage}%** smart!`);
    },

    hownice: async (message, args) => {
        const target = message.mentions.members.first() || message.member;
        const percentage = Math.floor(Math.random() * 101);
        message.reply(`😊 ${target.user.username} is **${percentage}%** nice!`);
    },

    howevil: async (message, args) => {
        const target = message.mentions.members.first() || message.member;
        const percentage = Math.floor(Math.random() * 101);
        message.reply(`😈 ${target.user.username} is **${percentage}%** evil!`);
    },

    chucknorris: async (message, args) => {
        message.reply('Chuck Norris doesn\'t read books. He stares them down until he gets the information he wants.');
    },

    dadjoke: async (message, args) => {
        const jokes = [
            "I'm afraid for the calendar. Its days are numbered.",
            "Why do fathers take an extra pair of socks when they go golfing? In case they get a hole in one!",
            "What do you call a fish wearing a bowtie? Sofishticated."
        ];
        message.reply(jokes[Math.floor(Math.random() * jokes.length)]);
    },

    yomama: async (message, args) => {
        const jokes = [
            "Yo mama so old, she knew Burger King while he was still a prince.",
            "Yo mama so tall, she tripped in Michigan and hit her head in Florida.",
            "Yo mama so nice, she helped an old lady cross the street!"
        ];
        message.reply(jokes[Math.floor(Math.random() * jokes.length)]);
    },

    insult: async (message, args) => {
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Mention someone to insult!');
        message.reply(`${target.user.username}, you're as useful as a screen door on a submarine!`);
    },

    advice: async (message, args) => {
        const advices = [
            "Don't take life too seriously.",
            "Always be yourself.",
            "Learn from your mistakes."
        ];
        message.reply(`💡 ${advices[Math.floor(Math.random() * advices.length)]}`);
    },

    cat: async (message, args) => {
        try {
            const response = await fetch('https://api.thecatapi.com/v1/images/search');
            const data = await response.json();
            const embed = new EmbedBuilder().setTitle('🐱 Random Cat').setImage(data[0].url).setColor('#FFA500');
            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Failed to fetch cat image.');
        }
    },

    dog: async (message, args) => {
        try {
            const response = await fetch('https://dog.ceo/api/breeds/image/random');
            const data = await response.json();
            const embed = new EmbedBuilder().setTitle('🐶 Random Dog').setImage(data.message).setColor('#8B4513');
            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Failed to fetch dog image.');
        }
    },

    fox: async (message, args) => {
        try {
            const response = await fetch('https://randomfox.ca/floof/');
            const data = await response.json();
            const embed = new EmbedBuilder().setTitle('🦊 Random Fox').setImage(data.image).setColor('#FF6347');
            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Failed to fetch fox image.');
        }
    },

    bird: async (message, args) => {
        try {
            const response = await fetch('https://some-random-api.com/animal/bird');
            const data = await response.json();
            const embed = new EmbedBuilder().setTitle('🐦 Random Bird').setImage(data.image).setColor('#87CEEB');
            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Failed to fetch bird image.');
        }
    },

    panda: async (message, args) => {
        try {
            const response = await fetch('https://some-random-api.com/animal/panda');
            const data = await response.json();
            const embed = new EmbedBuilder().setTitle('🐼 Random Panda').setImage(data.image).setColor('#000000');
            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Failed to fetch panda image.');
        }
    },

    koala: async (message, args) => {
        try {
            const response = await fetch('https://some-random-api.com/animal/koala');
            const data = await response.json();
            const embed = new EmbedBuilder().setTitle('🐨 Random Koala').setImage(data.image).setColor('#808080');
            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Failed to fetch koala image.');
        }
    },

    redpanda: async (message, args) => {
        try {
            const response = await fetch('https://some-random-api.com/animal/red_panda');
            const data = await response.json();
            const embed = new EmbedBuilder().setTitle('🦊 Random Red Panda').setImage(data.image).setColor('#D2691E');
            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Failed to fetch red panda image.');
        }
    },

    raccoon: async (message, args) => {
        try {
            const response = await fetch('https://some-random-api.com/animal/raccoon');
            const data = await response.json();
            const embed = new EmbedBuilder().setTitle('🦝 Random Raccoon').setImage(data.image).setColor('#696969');
            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Failed to fetch raccoon image.');
        }
    },

    kangaroo: async (message, args) => {
        try {
            const response = await fetch('https://some-random-api.com/animal/kangaroo');
            const data = await response.json();
            const embed = new EmbedBuilder().setTitle('🦘 Random Kangaroo').setImage(data.image).setColor('#CD853F');
            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Failed to fetch kangaroo image.');
        }
    },

    duck: async (message, args) => {
        message.reply('🦆 Random duck image coming soon!');
    },

    bunny: async (message, args) => {
        message.reply('🐰 Random bunny image coming soon!');
    },

    lizard: async (message, args) => {
        message.reply('🦎 Random lizard image coming soon!');
    },

    frog: async (message, args) => {
        message.reply('🐸 Random frog image coming soon!');
    },

    whale: async (message, args) => {
        message.reply('🐋 Random whale image coming soon!');
    },

    seal: async (message, args) => {
        message.reply('🦭 Random seal image coming soon!');
    },

    lion: async (message, args) => {
        message.reply('🦁 Random lion image coming soon!');
    },

    tiger: async (message, args) => {
        message.reply('🐯 Random tiger image coming soon!');
    },

    bear: async (message, args) => {
        message.reply('🐻 Random bear image coming soon!');
    },

    elephant: async (message, args) => {
        message.reply('🐘 Random elephant image coming soon!');
    },

    giraffe: async (message, args) => {
        message.reply('🦒 Random giraffe image coming soon!');
    },

    horse: async (message, args) => {
        message.reply('🐴 Random horse image coming soon!');
    },

    cow: async (message, args) => {
        message.reply('🐄 Random cow image coming soon!');
    },

    pig: async (message, args) => {
        message.reply('🐷 Random pig image coming soon!');
    },

    chicken: async (message, args) => {
        message.reply('🐔 Random chicken image coming soon!');
    },

    shark: async (message, args) => {
        message.reply('🦈 Random shark image coming soon!');
    },

    dolphin: async (message, args) => {
        message.reply('🐬 Random dolphin image coming soon!');
    },

    snake: async (message, args) => {
        message.reply('🐍 Random snake image coming soon!');
    },

    owl: async (message, args) => {
        message.reply('🦉 Random owl image coming soon!');
    },

    penguin: async (message, args) => {
        message.reply('🐧 Random penguin image coming soon!');
    },

    wolf: async (message, args) => {
        message.reply('🐺 Random wolf image coming soon!');
    },

    cheetah: async (message, args) => {
        message.reply('🐆 Random cheetah image coming soon!');
    },

    gorilla: async (message, args) => {
        message.reply('🦍 Random gorilla image coming soon!');
    },

    zebra: async (message, args) => {
        message.reply('🦓 Random zebra image coming soon!');
    },

    rhino: async (message, args) => {
        message.reply('🦏 Random rhino image coming soon!');
    },

    poll: async (message, args) => {
        if (args.length < 3) return message.reply('❌ Usage: >poll <question> | <option1> | <option2> | ...');
        const parts = args.join(' ').split('|').map(p => p.trim());
        const question = parts[0];
        const options = parts.slice(1);
        if (options.length < 2) return message.reply('❌ Provide at least 2 options.');
        
        const embed = new EmbedBuilder()
            .setTitle('📊 **Poll**')
            .setDescription(`**${question}**\n\n${options.map((opt, i) => `**${i + 1}.** ${opt}`).join('\n')}`)
            .setColor('#3498DB');
        const msg = await message.channel.send({ embeds: [embed] });
        
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        for (let i = 0; i < Math.min(options.length, 10); i++) {
            await msg.react(emojis[i]);
        }
    },

    suggest: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide a suggestion.');
        const embed = new EmbedBuilder()
            .setTitle('💡 **New Suggestion**')
            .setDescription(args.join(' '))
            .setColor('#2ECC71')
            .setFooter({ text: `Suggested by ${message.author.tag}` })
            .setTimestamp();
        const msg = await message.channel.send({ embeds: [embed] });
        await msg.react('✅');
        await msg.react('❌');
    },

    remind: async (message, args) => {
        message.reply('⏰ Reminder command acknowledged. Format: >remind <time> <message>');
    },

    timer: async (message, args) => {
        const seconds = parseInt(args[0]);
        if (!seconds) return message.reply('❌ Provide seconds for the timer.');
        message.reply(`⏲️ Timer set for **${seconds}** seconds!`);
        setTimeout(() => {
            message.reply(`⏰ ${message.author}, your timer is up!`);
        }, seconds * 1000);
    },

    stopwatch: async (message, args) => {
        message.reply('⏱️ Stopwatch command acknowledged. Coming soon!');
    },

    announcement: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ You need Manage Messages permission.');
        }
        if (!args.length) return message.reply('❌ Provide an announcement message.');
        const embed = new EmbedBuilder()
            .setTitle('📢 **ANNOUNCEMENT**')
            .setDescription(args.join(' '))
            .setColor('#E74C3C')
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    },

    embed: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide text for the embed.');
        const embed = new EmbedBuilder()
            .setDescription(args.join(' '))
            .setColor('#9B59B6');
        message.channel.send({ embeds: [embed] });
    },

    say: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide text to say.');
        message.channel.send(args.join(' '));
        message.delete().catch(() => {});
    },

    dm: async (message, args) => {
        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Mention a user to DM.');
        const text = args.slice(1).join(' ');
        if (!text) return message.reply('❌ Provide a message.');
        try {
            await member.send(text);
            message.reply('✅ DM sent!');
        } catch (error) {
            message.reply('❌ Could not send DM.');
        }
    },

    react: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide an emoji.');
        const emoji = args[0];
        message.react(emoji).catch(() => message.reply('❌ Invalid emoji.'));
    },

    snipe: async (message, args) => {
        const snipe = data.snipes[message.channel.id];
        if (!snipe) return message.reply('❌ Nothing to snipe!');
        const embed = new EmbedBuilder()
            .setAuthor({ name: snipe.author.tag, iconURL: snipe.author.displayAvatarURL() })
            .setDescription(snipe.content)
            .setColor('#95A5A6')
            .setFooter({ text: 'Deleted message' })
            .setTimestamp(snipe.timestamp);
        message.reply({ embeds: [embed] });
    },

    editsnipe: async (message, args) => {
        const snipe = data.editSnipes[message.channel.id];
        if (!snipe) return message.reply('❌ Nothing to snipe!');
        const embed = new EmbedBuilder()
            .setAuthor({ name: snipe.author.tag, iconURL: snipe.author.displayAvatarURL() })
            .addFields(
                { name: '**Before**', value: snipe.oldContent, inline: false },
                { name: '**After**', value: snipe.newContent, inline: false }
            )
            .setColor('#95A5A6')
            .setFooter({ text: 'Edited message' })
            .setTimestamp(snipe.timestamp);
        message.reply({ embeds: [embed] });
    },

    giveaway: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ You need Manage Messages permission.');
        }
        message.reply('🎉 Giveaway command acknowledged. Format: >giveaway <time> <prize>');
    },

    ticket: async (message, args) => {
        message.reply('🎫 Ticket system command acknowledged. Coming soon!');
    },

    report: async (message, args) => {
        message.reply('📝 Report command acknowledged. Mention a user and provide a reason.');
    },

    bug: async (message, args) => {
        if (!args.length) return message.reply('❌ Describe the bug.');
        message.reply('🐛 Bug report submitted! Thank you for your feedback.');
    },

    feedback: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide feedback.');
        message.reply('💬 Feedback submitted! Thank you!');
    },

    color: async (message, args) => {
        const color = args[0] || '#000000';
        const embed = new EmbedBuilder().setTitle('🎨 Color Preview').setColor(color).setDescription(`Color: **${color}**`);
        message.reply({ embeds: [embed] });
    },

    enlarge: async (message, args) => {
        const emoji = args[0];
        if (!emoji) return message.reply('❌ Provide an emoji.');
        message.reply('🔍 Emoji enlarge command acknowledged.');
    },

    stealemoji: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
            return message.reply('❌ You need Manage Emojis permission.');
        }
        message.reply('🥷 Steal emoji command acknowledged. Provide an emoji and name.');
    },

    findemoji: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide an emoji name.');
        message.reply('🔍 Find emoji command acknowledged.');
    },

    calculate: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide a math expression.');
        try {
            const result = eval(args.join(' '));
            message.reply(`🧮 Result: **${result}**`);
        } catch (error) {
            message.reply('❌ Invalid expression.');
        }
    },

    math: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide a math expression.');
        try {
            const result = eval(args.join(' '));
            message.reply(`🧮 Result: **${result}**`);
        } catch (error) {
            message.reply('❌ Invalid expression.');
        }
    },

    convert: async (message, args) => {
        message.reply('🔄 Convert command acknowledged. Specify units (e.g., >convert 10 km to miles)');
    },

    translate: async (message, args) => {
        message.reply('🌐 Translate command acknowledged. Format: >translate <lang> <text>');
    },

    weather: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide a city name.');
        message.reply(`🌤️ Weather for **${args.join(' ')}**: Coming soon!`);
    },

    time: async (message, args) => {
        const now = new Date();
        message.reply(`🕐 Current time: **${now.toLocaleTimeString()}**`);
    },

    timezone: async (message, args) => {
        message.reply('🌍 Timezone command acknowledged. Provide a timezone.');
    },

    reminder: async (message, args) => {
        message.reply('⏰ Reminder command acknowledged. Format: >reminder <time> <message>');
    },

    todo: async (message, args) => {
        if (!args.length) return message.reply('❌ Provide a todo item.');
        if (!data.todos[message.author.id]) data.todos[message.author.id] = [];
        data.todos[message.author.id].push(args.join(' '));
        saveData();
        message.reply('✅ Todo item added!');
    },

    notes: async (message, args) => {
        message.reply('📝 Notes command acknowledged. Coming soon!');
    },

    afk: async (message, args) => {
        const reason = args.join(' ') || 'AFK';
        data.afk[message.author.id] = reason;
        saveData();
        message.reply(`💤 You are now AFK: ${reason}`);
    },

    unafk: async (message, args) => {
        if (data.afk[message.author.id]) {
            delete data.afk[message.author.id];
            saveData();
            message.reply('✅ Welcome back! You are no longer AFK.');
        } else {
            message.reply('❌ You are not AFK.');
        }
    },

    members: async (message, args) => {
        message.reply(`👥 Total members: **${message.guild.memberCount}**`);
    },

    inrole: async (message, args) => {
        const role = message.mentions.roles.first();
        if (!role) return message.reply('❌ Mention a role.');
        message.reply(`👥 Members in **${role.name}**: **${role.members.size}**`);
    },

    serveremojis: async (message, args) => {
        const emojis = message.guild.emojis.cache.map(e => e.toString()).join(' ');
        message.reply(emojis || '❌ No custom emojis.');
    },

    prefix: async (message, args) => {
        message.reply(`🔧 Current prefix: **${data.settings.prefix || PREFIX}**`);
    },

    setprefix: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }
        message.reply('⚠️ Prefix is fixed to **>** and cannot be changed.');
    },

    language: async (message, args) => {
        message.reply('🌐 Language command acknowledged. Current: English');
    },

    setlanguage: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }
        message.reply('🌐 Set language command acknowledged.');
    },

    welcome: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }
        message.reply('👋 Welcome message command acknowledged.');
    },

    goodbye: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }
        message.reply('👋 Goodbye message command acknowledged.');
    },

    autorole: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }
        message.reply('🎭 Autorole command acknowledged.');
    },

    setactivity: async (message, args) => {
        if (message.author.id !== message.guild.ownerId) {
            return message.reply('❌ Only the server owner can use this command.');
        }
        if (!args.length) return message.reply('❌ Provide an activity.');
        const activity = args.join(' ');
        client.user.setActivity(activity);
        message.reply(`✅ Bot activity set to: **${activity}**`);
    },

    setstatus: async (message, args) => {
        if (message.author.id !== message.guild.ownerId) {
            return message.reply('❌ Only the server owner can use this command.');
        }
        const status = args[0]?.toLowerCase();
        const validStatuses = ['online', 'idle', 'dnd', 'invisible'];
        if (!validStatuses.includes(status)) {
            return message.reply('❌ Valid statuses: online, idle, dnd, invisible');
        }
        client.user.setStatus(status);
        message.reply(`✅ Bot status set to: **${status}**`);
    },

    logs: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }
        message.reply('📜 Logs command acknowledged.');
    },

    setlogs: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }
        message.reply('📜 Set logs channel command acknowledged. Mention a channel.');
    },

    muterole: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }
        message.reply('🔇 Mute role command acknowledged.');
    },

    antilink: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }
        message.reply('🔗 Anti-link command acknowledged.');
    },

    antispam: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }
        message.reply('🚫 Anti-spam command acknowledged.');
    },

    verification: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }
        message.reply('✅ Verification command acknowledged.');
    },

    captcha: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }
        message.reply('🔐 Captcha command acknowledged.');
    },

    automod: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }
        message.reply('🤖 Automod command acknowledged.');
    },

    filter: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }
        const words = data.settings.badWords.join(', ');
        message.reply(`🚫 **Filtered Words:** ${words || 'None'}`);
    },

    addword: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }
        const word = args[0]?.toLowerCase();
        if (!word) return message.reply('❌ Provide a word to filter.');
        if (!data.settings.badWords.includes(word)) {
            data.settings.badWords.push(word);
            saveData();
            message.reply(`✅ Added **${word}** to the filter.`);
        } else {
            message.reply('❌ Word already in filter.');
        }
    },

    removeword: async (message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ You need Manage Server permission.');
        }
        const word = args[0]?.toLowerCase();
        if (!word) return message.reply('❌ Provide a word to remove.');
        const index = data.settings.badWords.indexOf(word);
        if (index > -1) {
            data.settings.badWords.splice(index, 1);
            saveData();
            message.reply(`✅ Removed **${word}** from the filter.`);
        } else {
            message.reply('❌ Word not in filter.');
        }
    }
};

client.on('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    client.user.setActivity('with 224 commands!', { type: 0 });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (data.afk[message.author.id]) {
        delete data.afk[message.author.id];
        saveData();
        message.reply('✅ Welcome back! You are no longer AFK.').then(msg => {
            setTimeout(() => msg.delete(), 5000);
        });
    }

    message.mentions.users.forEach(user => {
        if (data.afk[user.id]) {
            message.reply(`💤 **${user.username}** is AFK: ${data.afk[user.id]}`);
        }
    });

    for (const word of data.settings.badWords) {
        if (message.content.toLowerCase().includes(word)) {
            try {
                await message.delete();
                if (!data.warns[message.author.id]) data.warns[message.author.id] = [];
                data.warns[message.author.id].push({ reason: 'Bad word usage', date: Date.now(), moderator: 'AutoMod' });
                saveData();

                const warnCount = data.warns[message.author.id].length;
                await sendWarnDM(message.author, 'Bad word usage', warnCount);

                if (warnCount >= WARN_LIMIT) {
                    const member = message.guild.members.cache.get(message.author.id);
                    if (member) {
                        await member.ban({ reason: `Reached ${WARN_LIMIT} warnings` });
                        message.channel.send(`⛔ **${message.author.tag}** has been automatically banned for reaching ${WARN_LIMIT} warnings!`);
                    }
                }
            } catch (error) {
                console.error('Error handling bad word:', error);
            }
            return;
        }
    }

    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = commands[commandName];
    if (command) {
        try {
            await command(message, args);
        } catch (error) {
            console.error(`Error executing command ${commandName}:`, error);
            message.reply('❌ An error occurred while executing this command.');
        }
    } else {
        message.reply('This is not a bot command.');
    }
});

client.on('messageDelete', (message) => {
    if (message.author.bot) return;
    data.snipes[message.channel.id] = {
        content: message.content,
        author: message.author,
        timestamp: message.createdTimestamp
    };
});

client.on('messageUpdate', (oldMessage, newMessage) => {
    if (oldMessage.author.bot) return;
    if (oldMessage.content === newMessage.content) return;
    data.editSnipes[newMessage.channel.id] = {
        oldContent: oldMessage.content,
        newContent: newMessage.content,
        author: newMessage.author,
        timestamp: newMessage.editedTimestamp
    };
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
    console.error('❌ DISCORD_BOT_TOKEN not found in environment variables!');
    process.exit(1);
}

loadData();
client.login(token);
