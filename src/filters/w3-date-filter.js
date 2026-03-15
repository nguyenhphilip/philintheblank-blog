import { DateTime } from 'luxon';

export const w3DateFilter = (value) => {
	const dateObj =
		value instanceof Date
			? DateTime.fromJSDate(value, { zone: 'utc' })
			: DateTime.fromISO(String(value), { zone: 'utc' });

	if (!dateObj.isValid) {
		return '';
	}

	return dateObj.toISODate();
};