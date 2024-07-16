const dotenv = require('dotenv');
dotenv.config()
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
        // GatewayIntentBits.DirectMessages
    ],
});

client.on("messageCreate", async (message) =>{
    console.log(message.content);
    if(message?.author.bot) return; // ignores bot messages
    const sender = message?.author;
    if(sender == null) return;
    if(message.content.toString().toUpperCase().includes("KRUNKER")) // case insensitive
    message.reply("KrunkBot: " + sender.displayName + " just Krunkered");
});

async function countKrunks(channelId) {
    const channel = await client.channels.fetch(channelId);
    let messageCount = 0;
    let lastMessageId;

    while (true) {
        const options = { limit: 100 };
        if (lastMessageId) {
            options.before = lastMessageId;
        }

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) {
            break;
        }

        messages.forEach(message => {
            if (message.content.toUpperCase().includes('KRUNKER') && !message.author.bot) {
                messageCount++;
            }
        });

        lastMessageId = messages.last().id;
    }

    return messageCount;
}

client.on('messageCreate', async (message) => {
    if (message.content === '!krunks') {
        const count = await countKrunks(message.channel.id);
        message.channel.send(`There are ${count} krunks in this channel.`);
    }
    if (message.content === '!dailyKrunk') {
        doKrunk(message);
    }
});

async function doKrunk(message) {
    
    try {
        const guild = await client.guilds.fetch(process.env.guildID);
        if (!guild) {
            console.error('Guild not found');
            return;
        }

        const members = await guild.members.fetch();
        members.forEach(member => {
            console.log(`Member: ${member.user.tag}`);
            if(member.roles.cache.has(process.env.roleID)) // idk how this would work tbh bc i shouldnt share api keys/sensitive stuff to pulic repo
            {
                message.channel.send(member.displayName + " says krunker");
            }
        });
    } catch (error) {
        console.error('Error fetching guild members:', error);
        message.channel.send("Something broke! Contact Samson pls")
    }
}


client.login(process.env.DISCORD_TOKEN)

