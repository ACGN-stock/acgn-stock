import { Meteor } from 'meteor/meteor';

export function formatDateTimeText(date) {
  if (! date) {
    return '????/??/?? ??:??:??';
  }

  return (
    `${date.getFullYear()}/${padZero(date.getMonth() + 1)}/${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}:${padZero(date.getSeconds())}`
  );
}

export function formatShortDateTimeText(date) {
  if (! date) {
    return '??/?? ??:??';
  }

  return (
    `${padZero(date.getMonth() + 1)}/${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}`
  );
}

export function formatShortDurationTimeText(time) {
  const timeBase = 1000 * 60;

  if (! time) {
    return '??:??';
  }

  time = Math.floor(time / timeBase);

  return (
    `${padZero(Math.floor(time / 60))}:${padZero(time % 60)}`
  );
}

export function formatLongDurationTimeText(time) {
  if (! time) {
    return '不明';
  }

  const secondBase = 1000;
  const minuteBase = 60 * secondBase;
  const hourBase = 60 * minuteBase;
  const dayBase = 24 * hourBase;

  let remainingTime = time;

  const days = Math.floor(remainingTime / dayBase);
  remainingTime -= days * dayBase;

  const hours = Math.floor(remainingTime / hourBase);
  remainingTime -= hours * hourBase;

  const minutes = Math.floor(remainingTime / minuteBase);
  remainingTime -= minutes * minuteBase;

  const seconds = Math.floor(remainingTime / secondBase);
  remainingTime -= seconds * secondBase;

  return [
    time >= dayBase ? `${days} 天` : '',
    time >= hourBase ? `${hours} 時` : '',
    time >= minuteBase ? `${minutes} 分` : '',
    time >= secondBase ? `${seconds} 秒` : ''
  ].join(' ').trim();
}

export function padZero(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * 到指定的時區
 * @param {Date} date 要轉換的時間
 * @param {Number} [timezone] 時區，如 UTC+8 為 8，預設用config中的 websiteInfo.timezone
 * @returns {Date} 轉換時區後的時間
 */
export function toCustomTimezone(date, timezone) {
  if (typeof timezone !== 'number') {
    timezone = Meteor.settings.public.websiteInfo.timezone;
  }

  return new Date(date.getTime() + date.getTimezoneOffset() * 60000 + timezone * 3600000);
}
