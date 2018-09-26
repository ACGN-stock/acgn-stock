// TODO 讓client與server用共通的function來format時間

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
