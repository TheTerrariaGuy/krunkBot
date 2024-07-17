const dotenv = require('dotenv');
dotenv.config()
const cron = require('node-cron');
const { Client, GatewayIntentBits, SystemChannelFlagsBitField } = require('discord.js');
const krunks = new Map();
const lastKrunks = new Map();

const client = new Client({
    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
        // GatewayIntentBits.DirectMessages
    ],
});

client.once('ready', () => {
    console.log(`Logged in yipeee!`);
    initialKrunkCount();
    cron.schedule('0 9 * * *', () => {
        const channel = client.channels.cache.get(process.env.krunkChannel);
        doKrunk(channel);
    },
    {scheduled: true, timezone: "America/New_York"}
    );
    console.log('Set le schedule!!!');
});

client.on("messageCreate", async (message) =>{
    console.log(message.content);
    if(message?.author.bot) return; // ignores bot messages
    const sender = message?.author;
    if(sender == null) return;
    if(message.content.toString().toUpperCase().includes("KRUNKER")) // case insensitive
    { // wdym the brackets arent consistent?
        if(Math.trunc(timeStamp/86400000) != Math.trunc(lastKrunks.get(message.author.id)/86400000)){
            message.reply("KrunkBot: " + sender.displayName + " just krunked for the day!");
            krunks(message.author.user.id) ++;
            lastKrunks(message.author.user.id) = message.id
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.content === '!krunkhelp') {
        message.channel.send("**KrunkerBot Help:** \nCommands: \n- !krunks: Counts the total number of krunkers in the channel \n- !krunks members: counts the total number of krunks per person");
    }
    if (message.content === '!krunks') {
        const count = await countKrunks(message.channel.id);
        message.channel.send(`There are ${count} krunks in this channel.`);
    }
    if (message.content === '!krunks members') {
        countKrunks(message.channelId);
    }
    if (message.content === '!dailyKrunk') {
        doKrunk(message.channel);
    }
});

async function countKrunks(channelId) {
    const channel = await client.channels.fetch(channelId);
    let messageCount = 0;
    let lastMessageId;

    while (true) {
        const options = { limit: 100 }; // processes the messages in batches of 100
        if (lastMessageId) {
            options.before = lastMessageId;
        }
        
        const messages = await channel.messages.fetch(options);
        console.log(messages.size);
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

async function doKrunk(channel) {
    
    try {
        const guild = await client.guilds.fetch(process.env.guildID);
        if (!guild) {
            console.error('Guild not found');
            return;
        }

        const members = await guild.members.fetch();
        members.forEach(member => {
            console.log(`Member: ${member.user.tag}`);
            if(member.roles.cache.has(process.env.roleID))
            {
                channel.send(member.displayName + " says krunker");
            }
        });
    } catch (error) {
        console.error('Error fetching guild members:', error);
        channel.send("Something broke! Contact Samson pls")
    }
}

async function initialKrunkCount(){
    const guild = await client.guilds.fetch(process.env.guildID);
    const members = await guild.members.fetch();
    console.log("1");
    members.forEach(member => {
        if(!member.user.bot){
            krunks.set(member.user.id, 0); // uses member id as key
            console.log(member.user.id + ": " + member.displayName);
            lastKrunks.set(member.user.id, -1); // member id as key, unix timestamp as value (if -1, then that measn it is unset)
        }
    });
    const channel = await client.channels.fetch(process.env.krunkChannel);
    let lastMessageId;
    console.log("2");
    while (true) {
        const options = { limit: 100 }; // processes messages in batches of 100

        if (lastMessageId) {
            options.before = lastMessageId;
        }

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) {
            break;
        }
        console.log(messages.size);
        messages.forEach(message => {
            if (message.content.toUpperCase().includes('KRUNKER') && !message.author.bot) {
                var timeStamp = message.createdTimestamp;
                if(Math.trunc(timeStamp/86400000) != Math.trunc(lastKrunks.get(message.author.id)/86400000)) // 86.4 million miliseconds in a day, checks if its in the same day or not
                {
                    krunks.set(message.author.id, krunks.get(message.author.id) + 1); // i forgor u cant just change maps with get() this took so long to figure out zzzzzzzzz 
                    lastKrunks.set(message.author.id, message.createdTimestamp); 
                }
            }
        });
        
        lastMessageId = messages.last().id;
    }
    listKrunks(process.env.krunkChannel);
    console.log("3");
}

// Displays a list of krunks by person
// may refactor to include different options (by year maybe etc)
async function listKrunks(channelID){
    out = "**Krunks:**\n";
    const names = [];
    const vals = [];
    krunks.forEach((value, key) => { // I HATE ASYNC AHHHHHHHHHHHH
        names.push(client.users.fetch(key));
        vals.push(value);
    });
    console.log("names: " + vals.length);
    const display = await Promise.all(names);
    console.log("display: " + display.length);
    for(let i = 0; i < vals.length; i ++){
        out = out + display[i].displayName + ": " + vals[i] + "\n";
    }
    const channel = await client.channels.fetch(channelID);
    channel.send(out);
}


client.login(process.env.DISCORD_TOKEN)

