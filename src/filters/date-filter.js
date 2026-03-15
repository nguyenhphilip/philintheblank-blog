import { DateTime } from 'luxon';

export const dateFilter = (value) => {
	const dateObj =
		value instanceof Date
			? DateTime.fromJSDate(value, { zone: 'utc' })
			: DateTime.fromISO(String(value), { zone: 'utc' });

	if (!dateObj.isValid) {
		return '';
	}

	return dateObj.toFormat("MMMM d, yyyy");
};