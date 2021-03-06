const axios = require('axios');
const cron = require('node-cron');
const cheerio = require('cheerio');
// const process = require('process');
const cookie = process.argv.slice(2)[0];


let DATA = [];

start();
cron.schedule('*/2 * * * *', () => {
	start();
});

function start() {
	axios('https://p2p.alamisharia.co.id/funder/dashboard', {
		headers: {
			cookie
		},
	})
		.then(({ data }) => {
			const $ = cheerio.load(data);
			const _companyName = $('.company-name');
			const LIST_COMPANY_NAME = [];
			const LIST_IMBAL_HASIL = [];
			const LIST_PERSENTASE_TERDANAI = [];
			const LIST_SISA_SLOT = [];
			const LIST_JATUH_TEMPO = [];
			const _listCompanyName = _companyName
				.find('strong')
				.map((i, el) => el.children[0].data);

			_listCompanyName
				.filter((e, i) => e < _listCompanyName.length / 11)
				.map((i, el) => LIST_COMPANY_NAME.push(el));

			const _imbalHasil = $('.line').siblings();
			_imbalHasil
				.filter((i, e) => i < LIST_COMPANY_NAME.length)
				.map((i, e) => LIST_IMBAL_HASIL.push(e.children[0].data));

			const _line = $('.line').siblings();
			_line
				.filter((i, el) => {
					return el.name === 'div';
				})
				.filter((i, el) => {
					const value = el.children[1].children[1].children[0].data;
					(i + 1) % 2 === 0
						? LIST_SISA_SLOT.push(value)
						: LIST_PERSENTASE_TERDANAI.push(value);
				});

			const _convertDate = $('.convertDate');
			_convertDate.map((i, e) => {
				if (i < _convertDate.length / 2 && i % 2 === 0) {
					const formattedDate = new Intl.DateTimeFormat('en-US', {
						dateStyle: 'medium',
					}).format(new Date(e.children[0].data));
					LIST_JATUH_TEMPO.push(formattedDate);
				}
			});

			const LIST_FUNDING = LIST_COMPANY_NAME.map((name, i) => ({
				kode: name,
				imbalHasil: LIST_IMBAL_HASIL[i],
				slot: LIST_SISA_SLOT[i],
				terdanai: LIST_PERSENTASE_TERDANAI[i].trim(),
				jatuhTempo: LIST_JATUH_TEMPO[i],
			}));

			let text = '';
			const minutes = new Date().getMinutes();

			if (DATA.length < LIST_FUNDING.length) {
				const newData = LIST_FUNDING.filter(
					(v) => !DATA.find((d) => d.kode === v.kode)
				);
				text =
					'New Funding\n------------\n\n' +
					newData
						.map(
							(d) =>
								`${Object.entries(d)
									.map(
										(d, i) =>
											`${d[0]}${[0, 2].includes(i) ? '\t\t' : '\t'}: ${d[1]}`
									)
									.join('\n')}\n\n`
						)
						.join('');
				onSendReportTelegram(text);
				console.log('DATA BARU');
			} else if (DATA.length > LIST_FUNDING.length) {
				const removedData = DATA.filter(
					(d) => !LIST_FUNDING.find((v) => v.kode === d.kode)
				);
				text =
					'Removed Funding:\n' +
					removedData
						.map(
							(d) =>
								`${Object.entries(d)
									.map(
										(d, i) =>
											`${d[0]}${[0, 2].includes(i) ? '\t\t' : '\t'}: ${d[1]}`
									)
									.join('\n')}\n\n`
						)
						.join('');
				onSendReportTelegram(text);
			} else if (DATA.length) {
				text =
					'\n\nList Funding:\n' +
					DATA.map(
						(d) =>
							`${Object.entries(d)
								.map(
									(d, i) =>
										`${d[0]}${[0, 2].includes(i) ? '\t\t' : '\t'}: ${d[1]}`
								)
								.join('\n')}\n\n`
					).join('');
				if (minutes % 10 === 0) {
					onSendReportTelegram(text);
				}
			} else {
				text = 'Token Expired!';
				if (!DATA.length && minutes % 10 === 0) {
					onSendReportTelegram(text);
				}
			}
			console.log(text);
			DATA = [...LIST_FUNDING];
		})
		.catch((err) => console.log(err));
}

function onSendReportTelegram(text) {
	axios
		.post(
			'https://api.telegram.org/bot1985349365:AAE7Mu-O1X-1J1gbX38WT7Gjw6rddnCyb3M/sendMessage',
			{
				chat_id: 1284428694,
				text,
			}
		)
		// .then((r) => console.log(r))
		.catch((e) => console.log(e));
}
