const dotenv = require('dotenv');
dotenv.config()
const cron = require('node-cron');
const { Client, GatewayIntentBits, SystemChannelFlagsBitField } = require('discord.js');
const krunks = new Map(); // id : int
const lastKrunks = new Map(); // id : int
const streaks = new Map(); // id : {start, longest}


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
        if(Math.trunc(message.createdTimestamp/86400000) != Math.trunc(lastKrunks.get(message.author.id)/86400000)){
            message.reply("KrunkBot: " + sender.displayName + " just krunked for the day!");
            if(krunks.has(message.author.user.id)) krunks.set(message.author.user.id, krunks.get(message.author.user.id) + 1);
            else krunks.set(message.author.user.id, 1);
            lastKrunks(message.author.user.id) = message.id
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.content === '!krunkhelp') {
        message.reply("**KrunkerBot Help:** \nCommands: \n- !krunks: Counts the total number of krunkers in the channel \n- !krunks members: counts the total number of krunks per person");
    }
    if (message.content === '!krunks') {
        const count = await countKrunks(message.channel.id);
        message.reply(`There are ${count} krunks in this channel.`);
    }
    if (message.content === '!krunks members') {
        listKrunks(message);
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
            if(member.roles.cache.has(process.env.roleID))
            {
                channel.send(member.displayName + " says krunker");
            }
        });
    } catch (error) {
        console.error("Error fetching guild members:", error);
        channel.send("Something broke! Contact Samson pls");
    }
}

async function initialKrunkCount(){
    const guild = await client.guilds.fetch(process.env.guildID);
    const members = await guild.members.fetch();
    members.forEach(member => {
        if(!member.user.bot){
            streaks.set(member.user.id, {last: -1, longest: -1}); // user id as key, {start (last continuous), longest} 
            krunks.set(member.user.id, 0); // uses member id as key
            lastKrunks.set(member.user.id, -1); // member id as key, unix timestamp as value (if -1, then that measn it is unset)
        }
    });
    const channel = await client.channels.fetch(process.env.krunkChannel);
    let lastMessageId;
    while (true) {
        const options = { limit: 100 }; // processes messages in batches of 100

        if (lastMessageId) {
            options.before = lastMessageId;
        }

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) {
            break;
        }
        messages.forEach(message => {
            if (message.content.toUpperCase().includes('KRUNKER') && !message.author.bot) {
                const timeStamp = message.createdTimestamp;
                const id = message.author.id;
                if(Math.trunc(timeStamp/86400000) != Math.trunc(lastKrunks.get(id)/86400000)) // 86.4 million miliseconds in a day, checks if its in the same day or not
                {
                    // all the streaking thingies
                    if(streaks.get(id).longest == -1) streaks.set(id, {last: timeStamp, longest: 1});
                    if(Math.abs(Math.trunc(timeStamp/86400000) - Math.trunc(lastKrunks.get(id)/86400000)) <= 1)
                    { // checks for consective days
                        console.log("streaking1");
                        console.log(streaks.get(id).longest);
                        console.log(Math.trunc(timeStamp/86400000));
                        console.log(Math.trunc(streaks.get(id).last/86400000));
                        if(streaks.get(id).longest <= Math.abs(Math.trunc(timeStamp/86400000) - Math.trunc(lastKrunks.get(id)/86400000))){ // for efficiency purposes, we arent constantly updating if there is any non highest streak
                            console.log("streaking2");
                            streaks.set(id, {last: streaks.get(id).last, longest: Math.abs(Math.trunc(timeStamp/86400000) - Math.trunc(lastKrunks.get(id)/86400000)) + 1}); // keeps last, but updates highest streak
                            // very goog programming practice ^^^
                            // print();
                        }
                    }else{
                        console.log("nostreak");
                        streaks.set(id, {last: timeStamp, longest: streaks.get(id).longest}); // updates timestamp if no active streak
                    }

                    krunks.set(id, krunks.get(message.author.id) + 1); // i forgor u cant just change maps with get() this took so long to figure out zzzzzzzzz 
                    lastKrunks.set(id, timeStamp); 
                }
            }
        });
        
        lastMessageId = messages.last().id;
    }
    listKrunks(null);
}

// Displays a list of krunks by person
// may refactor to include different options (by year maybe etc)
async function listKrunks(message){
    out = "**Krunks:**\n";
    const names = [];
    const vals = [];
    const longs = [];
    krunks.forEach((value, key) => { // I HATE ASYNC AHHHHHHHHHHHH i have to like cache everything grr
        names.push(client.users.fetch(key));
        vals.push(value);
        longs.push(streaks.get(key).longest);
    });
    const display = await Promise.all(names);
    for(let i = 0; i < vals.length; i ++){
        out = out + display[i].displayName + ": " + vals[i] + ", Highest Streak: " + longs[i] + "\n";
    }
    if(message == null){
        console.log(out);
        return;
    }
    message.reply(out);
}

async function topStreaks(message){

}




client.login(process.env.DISCORD_TOKEN)

