require('isomorphic-fetch');
const GD = require('gd.js');
const { Client, Intents, Modal, TextInputComponent, MessageActionRow, MessageButton } = require('discord.js');
const { ActivityType } = require('discord-api-types/v10');

const guildId  = process.env.GUILD_ID;
const token = process.env.TOKEN;

const modsChannelID = '1065581489577795646';
const reviewsChannelID = '1065581621543186442';
const successesChannelID = '1065581252960337921';
const discardsChannelID = '1065581416471072801';

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const gd = new GD();

const ytPattern = /^(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be.com\/\S*(?:watch|embed)(?:(?:(?=\/[-a-zA-Z0-9_]{11,}(?!\S))\/)|(?:\S*v=|v\/)))([-a-zA-Z0-9_]{11,})$/;

var modsChannel;
var reviewsChannel;
var successesChannel;
var discardsChannel;

client.once('ready', async () => {
    const guild = await client.guilds.fetch(guildId);
    modsChannel = client.channels.cache.get(modsChannelID);
    reviewsChannel = client.channels.cache.get(reviewsChannelID);
    successesChannel = client.channels.cache.get(successesChannelID);
    discardsChannel = client.channels.cache.get(discardsChannelID);

    client.user.setActivity("out for your level requests!", {
        type: ActivityType.Watching,
    });

    console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const { commandName, options } = interaction;

	if (commandName === 'req') {
        const levelID = options.getInteger('id');
        const reviewOpt = options.getString('review');

        const ytLinkInput = new TextInputComponent()
			.setCustomId('ytLinkInput')
			.setLabel("Link to YouTube video")
            .setMinLength(8)
            .setMaxLength(100)
            .setPlaceholder('https://www.youtube.com/watch?v=...')
            .setRequired(true)
			.setStyle('SHORT');
		const additionalInfoInput = new TextInputComponent()
			.setCustomId('additionalInfoInput')
			.setLabel("Additional info")
            .setMinLength(5)
            .setMaxLength(400)
            .setPlaceholder('Anything you want to add regarding this submission')
            .setRequired(false)
			.setStyle('PARAGRAPH');

		const firstActionRow = new MessageActionRow().addComponents(ytLinkInput);
		const secondActionRow = new MessageActionRow().addComponents(additionalInfoInput);

        const modal = new Modal()
			.setCustomId('reqModal-' + levelID + '-' + reviewOpt)
			.setTitle('Submit a new request')
            .addComponents(firstActionRow, secondActionRow);

		await interaction.showModal(modal);
	}
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isModalSubmit()) return;
	if (!interaction.customId.startsWith('reqModal')) return;

    const parts = interaction.customId.split('-')

    if (parts.length != 3) return;

	const ytLink = interaction.fields.getTextInputValue('ytLinkInput').trim();
	const additionalInfo = interaction.fields.getTextInputValue('additionalInfoInput');
    const levelID = parts[1]
    const reviewOpt = parts[2]

	if (ytLink.match(ytPattern) == null) {
        await interaction.reply({ content: 'Failed to send a level request: invalid YouTube link!', ephemeral: true });
        return;
    }

    gd.levels.get(levelID)
        .then(async levelInfo => {
            const creator = levelInfo.creator.accountID == null? null : await gd.users.getByAccountID(levelInfo.creator.accountID);

            const creatorStr = creator == null? 'Anonymous Creator' : creator.username
            const levelNameStr = '"' + levelInfo.name + '"'
            const diffStr = levelInfo.difficulty.level.pretty
            const reviewStr = reviewOpt == 'EN'? 'Yes (in English)' : reviewOpt == 'RU'? 'Yes (in Russian)' : 'No'
            const mention = interaction.user.toString()

            var msgText = ''
            msgText += levelNameStr + ' by ' + creatorStr + '\n'
            msgText += 'ID: ' + levelID + '\n'
            msgText += 'Difficulty: ' + diffStr + '\n'
            msgText += 'YT Link: ' + ytLink + '\n'
            msgText += 'Review: ' + reviewStr + '\n'
            msgText += '\n'
            if (additionalInfo)
                msgText += additionalInfo + '\n'

            const sBtn = new MessageButton()
                .setCustomId('sBtn-' + levelID + '-' + mention)
                .setLabel('Send')
                .setStyle('SUCCESS');

            const rnsBtn = new MessageButton()
                .setCustomId('rnsBtn-' + levelID + '-' + mention + '-' + reviewOpt)
                .setLabel('Review and Send')
                .setStyle('SUCCESS');

            const rndBtn = new MessageButton()    
                .setCustomId('rndBtn-' + levelID + '-' + mention + '-' + reviewOpt)
                .setLabel('Review and Discard')
                .setStyle('DANGER');

            const dBtn = new MessageButton()    
                .setCustomId('dBtn-' + levelID + '-' + mention)
                .setLabel('Discard')
                .setStyle('DANGER');

            const btns = reviewOpt == 'NONE'? [sBtn, dBtn] : [rnsBtn, rndBtn, dBtn];

            const row = new MessageActionRow()
                .addComponents(btns);

            await modsChannel.send({
                content: msgText,
                components: [row]
            });

            await interaction.reply({
                content: 'Success',
                ephemeral: true
            });
        })
        .catch(async reason => {
            console.log(reason);
            await interaction.reply({ content: 'Failed to send a level request: level not found!', ephemeral: true });
        })
});

//=============================================================================================================================

client.on('interactionCreate', async interaction => {
	if (!interaction.isButton()) return;
	if (!interaction.customId.startsWith('rnsBtn')) return;

	const parts = interaction.customId.split('-');
	const levelID = parts[1];
    const mention = parts[2];
    const reviewOpt = parts[3];

    var revPlaceholder;
    if (reviewOpt == 'EN')
        revPlaceholder = 'Write a review for this level here (in English)';
    else
        revPlaceholder = 'Напишите ревью уровня (на русском языке)';


	const reviewInput = new TextInputComponent()
		.setCustomId('reviewInput')
		.setLabel("Review")
        .setMinLength(5)
        .setMaxLength(400)
        .setPlaceholder(revPlaceholder)
        .setRequired(true)
		.setStyle('PARAGRAPH');

	const reviewRow = new MessageActionRow().addComponents(reviewInput);

    const modal = new Modal()
		.setCustomId('rnsModal-' + levelID + '-' + mention + '-' + interaction.message.id)
		.setTitle('Review a level and send to mods')
        .addComponents(reviewRow);

	await interaction.showModal(modal);
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isButton()) return;
	if (!interaction.customId.startsWith('rndBtn')) return;

	const parts = interaction.customId.split('-');
	const levelID = parts[1];
    const mention = parts[2];
    const reviewOpt = parts[3];

    var revPlaceholder;
    if (reviewOpt == 'EN')
        revPlaceholder = 'Write a review for this level here (in English)';
    else
        revPlaceholder = 'Напишите ревью уровня (на русском языке)';

	const reviewInput = new TextInputComponent()
		.setCustomId('reviewInput')
		.setLabel("Review")
        .setMinLength(5)
        .setMaxLength(400)
        .setPlaceholder(revPlaceholder)
        .setRequired(true)
		.setStyle('PARAGRAPH');

	const reviewRow = new MessageActionRow().addComponents(reviewInput);

	const reasonInput = new TextInputComponent()
		.setCustomId('reasonInput')
		.setLabel("Reason")
        .setMinLength(5)
        .setMaxLength(400)
        .setPlaceholder('Why did you decide to decline this request?')
        .setRequired(true)
		.setStyle('PARAGRAPH');

	const reasonRow = new MessageActionRow().addComponents(reasonInput);

    const modal = new Modal()
		.setCustomId('rndModal-' + levelID + '-' + mention + '-' + interaction.message.id)
		.setTitle('Review a level and discard a request')
        .addComponents(reviewRow, reasonRow);

	await interaction.showModal(modal);
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isButton()) return;
	if (!interaction.customId.startsWith('dBtn')) return;

	const parts = interaction.customId.split('-');
	const levelID = parts[1];
    const mention = parts[2];

	const reasonInput = new TextInputComponent()
		.setCustomId('reasonInput')
		.setLabel("Reason")
        .setMinLength(5)
        .setMaxLength(400)
        .setPlaceholder('Why did you decide to decline this request?')
        .setRequired(true)
		.setStyle('PARAGRAPH');

	const reasonRow = new MessageActionRow().addComponents(reasonInput);

    const modal = new Modal()
		.setCustomId('discardModal-' + levelID + '-' + mention + '-' + interaction.message.id)
		.setTitle('Discard a request')
        .addComponents(reasonRow);

	await interaction.showModal(modal);
});

//=============================================================================================================================

client.on('interactionCreate', async interaction => {
	if (!interaction.isButton()) return;
	if (!interaction.customId.startsWith('sBtn')) return;

	const parts = interaction.customId.split('-');
	const levelID = parts[1];
    const mention = parts[2];

	var successMsgText = '';
    successMsgText += 'Congradulations ' + mention + ', your level (ID: ' + levelID + ') was successfully sent to mods!';

    await successesChannel.send({
        content: successMsgText
    });

    await interaction.reply({
        content: 'Success',
        ephemeral: true
    });

    await interaction.message.delete(); 
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isModalSubmit()) return;
	if (!interaction.customId.startsWith('rnsModal')) return;

    const parts = interaction.customId.split('-');
	const levelID = parts[1];
    const mention = parts[2];
    const msgID = parts[3];
    const review = interaction.fields.getTextInputValue('reviewInput');

    var reviewMsgText = '';
    reviewMsgText += mention + ', a review for your level (ID: ' + levelID + ') is available:' + '\n';
    reviewMsgText += '\n';
    reviewMsgText += review;

    var successMsgText = '';
    successMsgText += 'Congradulations ' + mention + ', your level (ID: ' + levelID + ') was successfully sent to mods!';

    const fetchedMsg = await modsChannel.messages.fetch({ 
        around: msgID, 
        limit: 1 
    });

    await fetchedMsg.first().delete();

    await reviewsChannel.send({
        content: reviewMsgText
    });
    
    await successesChannel.send({
        content: successMsgText
    });

    await interaction.reply({
        content: 'Success',
        ephemeral: true
    });
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isModalSubmit()) return;
	if (!interaction.customId.startsWith('rndModal')) return;

    const parts = interaction.customId.split('-');
	const levelID = parts[1];
    const mention = parts[2];
    const msgID = parts[3];
    const review = interaction.fields.getTextInputValue('reviewInput');
    const reason = interaction.fields.getTextInputValue('reasonInput');

    var reviewMsgText = '';
    reviewMsgText += mention + ', a review for your level (ID: ' + levelID + ') is available:' + '\n';
    reviewMsgText += '\n';
    reviewMsgText += review;

    var discardMsgText = '';
    discardMsgText += mention + ', your level request (ID: ' + levelID + ') was discarded with the following reason:' + '\n';
    discardMsgText += reason;

    const fetchedMsg = await modsChannel.messages.fetch({ 
        around: msgID, 
        limit: 1 
    });

    await fetchedMsg.first().delete();

    await reviewsChannel.send({
        content: reviewMsgText
    });

    await discardsChannel.send({
        content: discardMsgText
    });

    await interaction.reply({
        content: 'Success',
        ephemeral: true
    });
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isModalSubmit()) return;
	if (!interaction.customId.startsWith('discardModal')) return;

    const parts = interaction.customId.split('-');
	const levelID = parts[1];
    const mention = parts[2];
    const msgID = parts[3];
    const reason = interaction.fields.getTextInputValue('reasonInput');

    var msgText = '';
    msgText += mention + ', your level request (ID: ' + levelID + ') was discarded with the following reason:' + '\n';
    msgText += reason;

    const fetchedMsg = await modsChannel.messages.fetch({ 
        around: msgID, 
        limit: 1 
    });

    await fetchedMsg.first().delete();

    await discardsChannel.send({
        content: msgText
    });

    await interaction.reply({
        content: 'Success',
        ephemeral: true
    });
});

client.login(token);
