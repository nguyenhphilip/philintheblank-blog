import { DateTime } from 'luxon';

export const wikiDateFilter = (value) => {
	const dateObj =
		value instanceof Date
			? DateTime.fromJSDate(value, { zone: 'utc' })
			: DateTime.fromISO(String(value), { zone: 'utc' });

	if (!dateObj.isValid) {
		return '';
	}

	const month = dateObj.toFormat('MMMM');
	const day = dateObj.toFormat('d');

	return `https://en.wikipedia.org/wiki/${month}_${day}`;
};