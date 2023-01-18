const { Client, Intents } = require('discord.js');

const clientId = process.env.CLIENT_ID;
const guildId  = process.env.GUILD_ID;
const token = process.env.TOKEN;

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'req') {
		await interaction.reply('Pong!');
	}
});

client.login(token);
